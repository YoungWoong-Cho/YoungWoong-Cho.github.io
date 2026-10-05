// Second step after prepare.py: find, per hand and preset, a converged IK
// configuration with random restarts (DLS is local, so a single warm start can
// settle in a poor basin), and store it in public/hands/hands.json as
// `ik_seeds` (HandInfo.joints order). The viewer starts from the "open" seed
// and uses lerp(seed[open], seed[preset], closure) as a weak joint-space prior
// while the live IK tracks the fingertip targets.
//
// Uses exactly the browser code (lib/hands/*). Needs jsdom + esbuild outside
// the repo, e.g. in $TOOLS (npm i jsdom esbuild):
//   NODE_PATH=$PWD/node_modules $TOOLS/node_modules/.bin/esbuild scripts/hands/seed-ik.mjs \
//     --bundle --platform=node --format=esm --external:jsdom --outfile=$TOOLS/seed-ik.bundle.mjs
//   node $TOOLS/seed-ik.bundle.mjs [repo root]
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import URDFLoader from "urdf-loader";
import { HandIK } from "../../lib/hands/ik";
import { humanTips } from "../../lib/hands/human";
import { HandRetargeter } from "../../lib/hands/retarget";

const { window } = new JSDOM("");
globalThis.DOMParser = window.DOMParser;
globalThis.Document = window.Document;
globalThis.Element = window.Element;

const RESTARTS = 32;
const TOL = 0.0005; // candidates within 0.5 mm of the best are "equally good"

const root = process.argv[2] || process.cwd();
const file = path.join(root, "public/hands/hands.json");
const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
const presets = manifest.presets;
const openPreset = presets.find((p) => p.id === "open");

let state = 12345;
const rnd = () => ((state = (state * 16807) % 2147483647) / 2147483647);
const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));

for (const info of manifest.hands) {
  delete info.ik_seeds;
  const loader = new URDFLoader();
  loader.parseVisual = false;
  const robot = loader.parse(fs.readFileSync(path.join(root, "public", info.urdf), "utf8"));
  robot.updateMatrixWorld(true);
  const ik = new HandIK(robot, info);
  const rt = new HandRetargeter(ik, info);
  const limits = info.joints.map((j) => [j.lower, j.upper]);
  const neutral = limits.map(([lo, hi]) => Math.min(hi, Math.max(lo, 0)));
  const random = () => limits.map(([lo, hi]) => lo + (hi - lo) * rnd());

  const settle = (preset, start) => {
    ik.setConfig(start);
    const tips = humanTips(manifest.human, preset.pose);
    for (let f = 0; f < 100; f++) rt.step(tips, preset.contacts, 6);
    return { q: ik.config(), score: rt.meanErr };
  };
  const choose = (preset, starts, ref) => {
    const c = starts.map((s) => settle(preset, s));
    const best = Math.min(...c.map((x) => x.score));
    const ok = c.filter((x) => x.score <= best + TOL);
    ok.sort((a, b) => dist(a.q, ref) - dist(b.q, ref));
    return { q: ok[0].q, score: ok[0].score };
  };

  const seeds = {};
  const report = [];
  const open = choose(openPreset, [neutral, ...Array.from({ length: RESTARTS }, random)], neutral);
  seeds.open = open.q;
  report.push(`open ${(open.score * 1000).toFixed(1)}`);
  for (const p of presets) {
    if (p.id === "open") continue;
    const r = choose(p, [seeds.open, ...Array.from({ length: RESTARTS }, random)], seeds.open);
    seeds[p.id] = r.q;
    report.push(`${p.id} ${(r.score * 1000).toFixed(1)}`);
  }
  info.ik_seeds = Object.fromEntries(
    Object.entries(seeds).map(([k, q]) => [k, q.map((v) => Math.round(v * 1e5) / 1e5)]),
  );
  console.log(`${info.key.padEnd(13)} mean tip residual (mm): ${report.join(", ")}`);
}
fs.writeFileSync(file, JSON.stringify(manifest, null, 1));
console.log(`wrote ik_seeds to ${path.relative(root, file)}`);
