// Canonical human hand: forward kinematics in the shared palm frame.
// Mirrors human_finger_points / human_thumb_points in scripts/hands/prepare.py.
// Palm frame: +X wrist -> fingers, +Y thumb side, +Z back of the hand (metres).

import type { HandPose, HumanModel, Slot, Vec3 } from "./types";

type M3 = number[]; // row-major 3x3

const rx = (a: number): M3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const ry = (a: number): M3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
};
const rz = (a: number): M3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
const mul = (a: M3, b: M3): M3 => {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
};
/** p + R * [len, 0, 0] */
const step = (p: Vec3, R: M3, len: number): Vec3 => [
  p[0] + R[0] * len,
  p[1] + R[3] * len,
  p[2] + R[6] * len,
];

export interface HumanKeypoints {
  wrist: Vec3;
  /** cmc, mcp, ip, tip */
  thumb: Vec3[];
  /** per finger (index..little): mcp, pip, dip, tip */
  fingers: Vec3[][];
}

export function humanKeypoints(model: HumanModel, pose: HandPose): HumanKeypoints {
  const fingers = model.fingers.map((f, i) => {
    const a = pose.fingers[i];
    let R = rz(f.spread + a[0]);
    let p: Vec3 = [...f.mcp];
    const pts: Vec3[] = [p];
    for (let k = 0; k < 3; k++) {
      R = mul(R, ry(a[k + 1]));
      p = step(p, R, f.lengths[k]);
      pts.push(p);
    }
    return pts;
  });
  const t = pose.thumb;
  let R = mul(mul(rz(t[0]), ry(t[1])), rx(t[2]));
  let p: Vec3 = [...model.thumb.cmc];
  const thumb: Vec3[] = [p];
  for (let k = 0; k < 3; k++) {
    if (k > 0) R = mul(R, rz(-t[2 + k]));
    p = step(p, R, model.thumb.lengths[k]);
    thumb.push(p);
  }
  return { wrist: [0, 0, 0], thumb, fingers };
}

export function humanTips(model: HumanModel, pose: HandPose): Record<Slot, Vec3> {
  const k = humanKeypoints(model, pose);
  return {
    thumb: k.thumb[3],
    index: k.fingers[0][3],
    middle: k.fingers[1][3],
    ring: k.fingers[2][3],
    little: k.fingers[3][3],
  };
}

export function clonePose(p: HandPose): HandPose {
  return { fingers: p.fingers.map((f) => [...f]), thumb: [...p.thumb] };
}

/** out = a + (b - a) * t, written into `out` (which may alias a). */
export function lerpPose(a: HandPose, b: HandPose, t: number, out: HandPose): HandPose {
  for (let i = 0; i < a.fingers.length; i++)
    for (let j = 0; j < a.fingers[i].length; j++)
      out.fingers[i][j] = a.fingers[i][j] + (b.fingers[i][j] - a.fingers[i][j]) * t;
  for (let j = 0; j < a.thumb.length; j++) out.thumb[j] = a.thumb[j] + (b.thumb[j] - a.thumb[j]) * t;
  return out;
}

export function poseDistance(a: HandPose, b: HandPose): number {
  let m = 0;
  for (let i = 0; i < a.fingers.length; i++)
    for (let j = 0; j < a.fingers[i].length; j++) m = Math.max(m, Math.abs(a.fingers[i][j] - b.fingers[i][j]));
  for (let j = 0; j < a.thumb.length; j++) m = Math.max(m, Math.abs(a.thumb[j] - b.thumb[j]));
  return m;
}
