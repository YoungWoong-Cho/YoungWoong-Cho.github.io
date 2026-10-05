// Per-finger damped-least-squares IK on a urdf-loader robot.
//
// Each fingertip slot is solved independently: J is the 3 x n positional
// Jacobian of the tip w.r.t. the finger's actuated joints, built analytically
// from link world matrices (a revolute column is axis x (tip - joint)); a joint
// that drives mimic joints in the same chain accumulates their columns scaled
// by the mimic multiplier. Joint limits are enforced by clamping each step.
// Works without a DOM (also used by scripts/hands/verify-ik.mjs).

import { Matrix4, Object3D, Vector3 } from "three";
import type { URDFJoint, URDFMimicJoint, URDFRobot } from "urdf-loader";
import { SLOTS, type HandInfo, type Slot } from "./types";

interface Term {
  joint: URDFJoint;
  mult: number;
}

interface Column {
  master: URDFJoint;
  lower: number;
  upper: number;
  terms: Term[];
}

interface Finger {
  slot: Slot;
  link: Object3D;
  site: Vector3;
  columns: Column[];
}

const _rootInv = new Matrix4();
const _tip = new Vector3();
const _p = new Vector3();
const _a = new Vector3();
const _e = new Vector3();
const _c = new Vector3();

export type Targets = Partial<Record<Slot, Vector3 | null>>;

export class HandIK {
  readonly robot: URDFRobot;
  readonly fingers: Finger[] = [];
  /** Last residual per slot (metres, in the robot root frame). */
  readonly errors: Partial<Record<Slot, number>> = {};
  /** Largest joint step applied during the last solve() (rad or m). */
  lastStep = 0;
  /** Actuated joints in HandInfo.joints order (for seeds / priors). */
  readonly order: (URDFJoint | undefined)[];

  constructor(robot: URDFRobot, info: HandInfo) {
    this.robot = robot;
    this.order = info.joints.map((j) => robot.joints[j.name]);
    for (const slot of SLOTS) {
      const s = info.slots[slot];
      if (!s) continue;
      const link = robot.links[s.link];
      if (!link) throw new Error(`${info.key}: missing tip link ${s.link}`);
      // Every joint between the root and the tip link.
      const chain = new Set<URDFJoint>();
      for (let o: Object3D | null = link; o && o !== robot; o = o.parent)
        if ((o as URDFJoint).isURDFJoint) chain.add(o as URDFJoint);
      const columns: Column[] = [];
      for (const name of s.joints) {
        const master = robot.joints[name];
        if (!master) throw new Error(`${info.key}: missing joint ${name}`);
        const terms: Term[] = [];
        const collect = (j: URDFJoint, mult: number) => {
          if (chain.has(j)) terms.push({ joint: j, mult });
          for (const m of j.mimicJoints as URDFMimicJoint[]) collect(m, mult * m.multiplier);
        };
        collect(master, 1);
        const lim = master.limit;
        const continuous = master.jointType === "continuous";
        columns.push({
          master,
          lower: continuous ? -Infinity : lim.lower,
          upper: continuous ? Infinity : lim.upper,
          terms,
        });
      }
      this.fingers.push({ slot, link, site: new Vector3(...s.site), columns });
    }
  }

  /** Put every actuated joint at 0 clamped into its limits. */
  reset(): void {
    for (const f of this.fingers)
      for (const c of f.columns) c.master.setJointValue(Math.min(c.upper, Math.max(c.lower, 0)));
    this.robot.updateMatrixWorld(true);
  }

  /** Current actuated joint values in HandInfo.joints order. */
  config(out: number[] = []): number[] {
    this.order.forEach((j, i) => (out[i] = j?.jointValue[0] ?? 0));
    return out;
  }

  /** Set actuated joints (HandInfo.joints order), clamped to limits by urdf-loader. */
  setConfig(values: number[]): void {
    this.order.forEach((j, i) => j?.setJointValue(values[i]));
  }

  /**
   * Pull the configuration a fraction `gamma` towards a joint-space prior
   * lerp(a, b, t). Keeps the solver in the basin of a known good solution;
   * the DLS steps that follow restore the fingertip targets.
   */
  attract(a: number[], b: number[], t: number, gamma: number): void {
    this.order.forEach((j, i) => {
      if (!j) return;
      const q = j.jointValue[0] ?? 0;
      const target = a[i] + (b[i] - a[i]) * t;
      j.setJointValue(q + gamma * (target - q));
    });
  }

  /** Fingertip position of a slot in the robot root frame. */
  tip(slot: Slot, out = new Vector3()): Vector3 | null {
    const f = this.fingers.find((x) => x.slot === slot);
    if (!f) return null;
    this.robot.updateWorldMatrix(true, false);
    _rootInv.copy(this.robot.matrixWorld).invert();
    f.link.updateWorldMatrix(true, false);
    return out.copy(f.site).applyMatrix4(f.link.matrixWorld).applyMatrix4(_rootInv);
  }

  /**
   * Run `iterations` DLS steps per finger towards `targets` (robot root frame).
   * Slots without a target (or a finger) are skipped. Returns the max residual.
   */
  solve(targets: Targets, iterations = 4, damping = 0.012, maxStep = 0.3): number {
    this.robot.updateWorldMatrix(true, false);
    _rootInv.copy(this.robot.matrixWorld).invert();
    const lambda2 = damping * damping;
    let worst = 0;
    this.lastStep = 0;
    const J: number[] = [];
    for (const f of this.fingers) {
      const target = targets[f.slot];
      if (!target) {
        this.errors[f.slot] = undefined;
        continue;
      }
      const n = f.columns.length;
      let err = 0;
      for (let it = 0; it <= iterations; it++) {
        f.link.updateWorldMatrix(true, false);
        _tip.copy(f.site).applyMatrix4(f.link.matrixWorld).applyMatrix4(_rootInv);
        _e.subVectors(target, _tip);
        err = _e.length();
        if (it === iterations || err < 1e-5) break;
        // Jacobian columns (3 x n, column-major in J)
        J.length = 3 * n;
        for (let k = 0; k < n; k++) {
          let jx = 0, jy = 0, jz = 0;
          for (const { joint, mult } of f.columns[k].terms) {
            _a.copy(joint.axis).transformDirection(joint.matrixWorld).transformDirection(_rootInv);
            if (joint.jointType === "prismatic") {
              _c.copy(_a);
            } else {
              _p.setFromMatrixPosition(joint.matrixWorld).applyMatrix4(_rootInv);
              _c.subVectors(_tip, _p).crossVectors(_a, _c);
            }
            jx += mult * _c.x;
            jy += mult * _c.y;
            jz += mult * _c.z;
          }
          J[3 * k] = jx;
          J[3 * k + 1] = jy;
          J[3 * k + 2] = jz;
        }
        // A = J J^T + lambda^2 I (3x3, symmetric); y = A^-1 e; dq = J^T y
        let a00 = lambda2, a01 = 0, a02 = 0, a11 = lambda2, a12 = 0, a22 = lambda2;
        for (let k = 0; k < n; k++) {
          const x = J[3 * k], y = J[3 * k + 1], z = J[3 * k + 2];
          a00 += x * x; a01 += x * y; a02 += x * z;
          a11 += y * y; a12 += y * z; a22 += z * z;
        }
        const c00 = a11 * a22 - a12 * a12;
        const c01 = a02 * a12 - a01 * a22;
        const c02 = a01 * a12 - a02 * a11;
        const det = a00 * c00 + a01 * c01 + a02 * c02;
        if (!Number.isFinite(det) || Math.abs(det) < 1e-18) break;
        const c11 = a00 * a22 - a02 * a02;
        const c12 = a01 * a02 - a00 * a12;
        const c22 = a00 * a11 - a01 * a01;
        const ex = _e.x, ey = _e.y, ez = _e.z;
        const yx = (c00 * ex + c01 * ey + c02 * ez) / det;
        const yy = (c01 * ex + c11 * ey + c12 * ez) / det;
        const yz = (c02 * ex + c12 * ey + c22 * ez) / det;
        let maxAbs = 0;
        const dq: number[] = new Array(n);
        for (let k = 0; k < n; k++) {
          dq[k] = J[3 * k] * yx + J[3 * k + 1] * yy + J[3 * k + 2] * yz;
          maxAbs = Math.max(maxAbs, Math.abs(dq[k]));
        }
        // Backtracking: accept the (clamped) step only if the residual drops;
        // otherwise halve it, and stop at the local optimum if nothing helps.
        const scale = maxAbs > maxStep ? maxStep / maxAbs : 1;
        const q0s = f.columns.map((c) => c.master.jointValue[0] ?? 0);
        let accepted = false;
        for (let alpha = scale; alpha >= scale / 8; alpha /= 2) {
          for (let k = 0; k < n; k++) {
            const c = f.columns[k];
            c.master.setJointValue(Math.min(c.upper, Math.max(c.lower, q0s[k] + dq[k] * alpha)));
          }
          f.link.updateWorldMatrix(true, false);
          _tip.copy(f.site).applyMatrix4(f.link.matrixWorld).applyMatrix4(_rootInv);
          if (_tip.distanceTo(target) < err) {
            accepted = true;
            break;
          }
        }
        if (!accepted) {
          f.columns.forEach((c, k) => c.master.setJointValue(q0s[k]));
          f.link.updateWorldMatrix(true, false);
          break;
        }
        for (let k = 0; k < n; k++)
          this.lastStep = Math.max(this.lastStep, Math.abs((f.columns[k].master.jointValue[0] ?? 0) - q0s[k]));
      }
      this.errors[f.slot] = err;
      worst = Math.max(worst, err);
    }
    return worst;
  }
}
