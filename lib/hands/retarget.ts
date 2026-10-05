// Human fingertips -> per-hand IK targets.
//
// Every hand receives the same palm-frame fingertip targets from the canonical
// human hand, mapped by a per-hand similarity (s * h + t: s from middle-finger
// length, t aligning the finger bases). Fingers whose kinematics cannot reach a
// contact the human makes (e.g. a thumb mounted far down the palm) would leave
// a visible gap, so presets may declare contact pairs. Near contact each finger
// of a pair is pulled towards the partner's *achieved* tip (plus the human's
// relative offset): alternating minimisation of
//   |a - Ta|^2 + |b - Tb|^2 + K |a - b - rel|^2,   K = COUPLING / (1 - COUPLING).
// If both targets are reachable the fixed point is exactly (Ta, Tb); otherwise
// it trades absolute error for the contact, as pinch-aware retargeting does.

import { Vector3 } from "three";
import type { HandIK, Targets } from "./ik";
import { SLOTS, type HandInfo, type Slot, type Vec3 } from "./types";

export type Contact = [Slot, Slot];

const CONTACT_FULL = 0.02; // human tip distance (m) at which coupling is full
const CONTACT_NONE = 0.034; // ... and where it fades out
const COUPLING = 0.9;

export function mapTargets(info: HandInfo, tips: Record<Slot, Vec3>, out: Targets): Targets {
  const s = info.target_scale, o = info.target_offset;
  for (const slot of SLOTS) {
    if (!info.slots[slot]) {
      out[slot] = null;
      continue;
    }
    const h = tips[slot];
    const v = (out[slot] ??= new Vector3());
    v.set(s * h[0] + o[0], s * h[1] + o[1], s * h[2] + o[2]);
  }
  return out;
}

const _tip = new Vector3();
const _rel = new Vector3();
const _acc = new Vector3();

/**
 * Write effective targets for this frame into `out` (base targets with contact
 * coupling applied, using the hand's current fingertip positions).
 */
export function coupleTargets(
  ik: HandIK,
  info: HandInfo,
  tips: Record<Slot, Vec3>,
  base: Targets,
  contacts: Contact[] | undefined,
  out: Targets,
): Targets {
  for (const slot of SLOTS) {
    const b = base[slot];
    if (!b) out[slot] = null;
    else (out[slot] ??= new Vector3()).copy(b);
  }
  if (!contacts?.length) return out;
  const s = info.target_scale;
  // a (the thumb) may have several partners: average their pulls
  const pulls = new Map<Slot, { sum: Vector3; w: number; n: number }>();
  for (const [a, b] of contacts) {
    const ta = base[a], tb = base[b];
    if (!ta || !tb) continue;
    const ha = tips[a], hb = tips[b];
    const d = Math.hypot(ha[0] - hb[0], ha[1] - hb[1], ha[2] - hb[2]);
    const x = Math.min(1, Math.max(0, (CONTACT_NONE - d) / (CONTACT_NONE - CONTACT_FULL)));
    const w = COUPLING * x * x * (3 - 2 * x);
    if (w <= 0) continue;
    _rel.set(s * (ha[0] - hb[0]), s * (ha[1] - hb[1]), s * (ha[2] - hb[2]));
    if (ik.tip(a, _tip)) out[b]!.lerp(_acc.copy(_tip).sub(_rel), w);
    if (ik.tip(b, _tip)) {
      const p = pulls.get(a) ?? { sum: new Vector3(), w: 0, n: 0 };
      p.sum.add(_tip.add(_rel));
      p.w += w;
      p.n += 1;
      pulls.set(a, p);
    }
  }
  for (const [a, p] of pulls) out[a]!.lerp(p.sum.divideScalar(p.n), p.w / p.n);
  return out;
}

/** Mean |achieved tip - base target| over the hand's fingers (m). */
export function meanError(ik: HandIK, base: Targets): number {
  let sum = 0, n = 0;
  for (const f of ik.fingers) {
    const t = base[f.slot];
    if (!t || !ik.tip(f.slot, _tip)) continue;
    sum += _tip.distanceTo(t);
    n++;
  }
  return n ? sum / n : 0;
}

/** Per-hand retargeting state: mapped targets, coupled targets, residual. */
export class HandRetargeter {
  readonly ik: HandIK;
  readonly info: HandInfo;
  readonly base: Targets = {};
  readonly eff: Targets = {};
  meanErr = 0;
  /** Largest net joint change during the last step(). */
  motion = 0;
  /**
   * Joint-space prior (HandInfo.joints order): a smoothed blend of the offline
   * IK seeds of "open" and the active preset. Each step restarts DLS from it,
   * so the solution is a smooth function of the targets and never drifts into
   * a poor local minimum along the way.
   */
  prior: number[] | null = null;
  private before: number[] = [];
  private after: number[] = [];

  constructor(ik: HandIK, info: HandInfo) {
    this.ik = ik;
    this.info = info;
  }

  get hasSeeds(): boolean {
    return !!this.info.ik_seeds?.open;
  }

  /** Jump to a preset's stored solution (if any). */
  seed(preset: string): boolean {
    const q = this.info.ik_seeds?.[preset];
    if (!q) return false;
    this.ik.setConfig(q);
    this.prior = [...q];
    return true;
  }

  /** Ease the prior towards lerp(seed[from], seed[to], t) by fraction k (1 = jump). */
  updatePrior(from: string, to: string, t: number, k: number): void {
    const seeds = this.info.ik_seeds;
    const a = seeds?.[from], b = seeds?.[to];
    if (!a || !b) return;
    const p = (this.prior ??= [...a]);
    for (let i = 0; i < a.length; i++) {
      const target = a[i] + (b[i] - a[i]) * t;
      p[i] += (target - p[i]) * k;
    }
  }

  step(tips: Record<Slot, Vec3>, contacts: Contact[] | undefined, iterations: number): number {
    const ik = this.ik;
    ik.config(this.before);
    mapTargets(this.info, tips, this.base);
    if (this.prior) ik.setConfig(this.prior);
    coupleTargets(ik, this.info, tips, this.base, contacts, this.eff);
    ik.solve(this.eff, iterations);
    this.meanErr = meanError(ik, this.base);
    ik.config(this.after);
    let m = 0;
    for (let i = 0; i < this.after.length; i++) m = Math.max(m, Math.abs(this.after[i] - this.before[i]));
    this.motion = m;
    return m;
  }
}
