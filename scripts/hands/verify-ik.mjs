// Offline check of the viewer's IK: loads every prepared URDF with urdf-loader
// (DOMParser from jsdom), drives it with the same per-frame loop as the browser
// (HandRetargeter.step: map human fingertips -> seed prior -> contact coupling
// -> DLS), and reports fingertip residuals against the mapped targets.
//
// Needs jsdom + esbuild outside the repo, e.g. in $TOOLS (npm i jsdom esbuild):
//   NODE_PATH=$PWD/node_modules $TOOLS/node_modules/.bin/esbuild scripts/hands/verify-ik.mjs \
//     --bundle --platform=node --format=esm --external:jsdom --outfile=$TOOLS/verify-ik.bundle.mjs
//   node $TOOLS/verify-ik.bundle.mjs [repo root]
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { Vector3 } from "three";
import URDFLoader from "urdf-loader";
import { HandIK } from "../../lib/hands/ik";
import { humanTips, lerpPose, clonePose } from "../../lib/hands/human";
import { HandRetargeter } from "../../lib/hands/retarget";

const { window } = new JSDOM("");
globalThis.DOMParser = window.DOMParser;
globalThis.Document = window.Document;
globalThis.Element = window.Element;

const root = process.argv[2] || process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "public/hands/hands.json"), "utf8"));
const preset = (id) => manifest.presets.find((p) => p.id === id);
const open = preset("open").pose;

const K = 1 - Math.exp(-1 / 60 / 0.09); // prior smoothing per 60 Hz frame, as lib/hands/scene.ts
function frame(rt, pose, presetId, closure, contacts, iterations) {
  const tips = humanTips(manifest.human, pose);
  rt.updatePrior("open", presetId, closure, K);
  rt.step(tips, contacts, iterations);
}

function residuals(ik, base) {
  const out = {};
  const v = new Vector3();
  for (const f of ik.fingers) if (base[f.slot] && ik.tip(f.slot, v)) out[f.slot] = v.distanceTo(base[f.slot]);
  return out;
}

const mm = (x) => (x === undefined ? "  -  " : (x * 1000).toFixed(1).padStart(5));
const rows = [];
for (const info of manifest.hands) {
  const loader = new URDFLoader();
  loader.parseVisual = false;
  const robot = loader.parse(fs.readFileSync(path.join(root, "public", info.urdf), "utf8"));
  robot.updateMatrixWorld(true);
  const ik = new HandIK(robot, info);
  const rt = new HandRetargeter(ik, info);
  const base = rt.base;
  for (const p of manifest.presets) {
    // as the viewer: start from the open seed, then closure ramps 0 -> 1 over
    // 60 frames (1 s) and is held for 30; 5 DLS iterations per frame
    if (!rt.seed("open")) ik.reset();
    for (let k = 0; k < 10; k++) frame(rt, open, p.id, 0, [], 5);
    const pose = clonePose(open);
    for (let f = 0; f < 90; f++) {
      const c = Math.min(1, f / 60);
      const e = c * c * (3 - 2 * c);
      lerpPose(open, p.pose, e, pose);
      frame(rt, pose, p.id, e, p.contacts, 5);
    }
    const live = residuals(ik, base);
    for (let f = 0; f < 200; f++) frame(rt, p.pose, p.id, 1, p.contacts, 5);
    const conv = residuals(ik, base);
    // contact gap: achieved (thumb - partner) vs the human's (scaled) relative vector
    const gaps = [];
    const tips = humanTips(manifest.human, p.pose);
    for (const [a, b] of p.contacts ?? []) {
      if (!info.slots[a] || !info.slots[b]) continue;
      const ta = ik.tip(a), tb = ik.tip(b);
      const rel = new Vector3(...tips[a]).sub(new Vector3(...tips[b])).multiplyScalar(info.target_scale);
      gaps.push(ta.sub(tb).sub(rel).length());
    }
    rows.push({ hand: info.key, dof: info.dof, preset: p.id, live, conv, gap: gaps.length ? Math.max(...gaps) : undefined });
  }
}

console.log("fingertip residual |tip - target| (mm): after 90 animated frames x 5 DLS iters | after +200 frames | contact gap");
console.log("hand          dof preset     thumb index middle  ring little | thumb index middle  ring little | gap");
for (const r of rows) {
  const a = manifest.slots.map((s) => mm(r.live[s])).join(" ");
  const b = manifest.slots.map((s) => mm(r.conv[s])).join(" ");
  console.log(`${r.hand.padEnd(13)} ${String(r.dof).padStart(3)} ${r.preset.padEnd(10)} ${a} | ${b} | ${mm(r.gap)}`);
}
console.log("\nPinch (converged): thumb / index residual, thumb-index contact gap error (mm)");
for (const r of rows.filter((x) => x.preset === "pinch"))
  console.log(`  ${r.hand.padEnd(13)} thumb ${mm(r.conv.thumb)}  index ${mm(r.conv.index)}  gap ${mm(r.gap)}`);
