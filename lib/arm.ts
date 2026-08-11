/**
 * Minimal 2-link planar arm, used as the "robot" that consumes action chunks.
 * Joint space is q = (q0, q1) in radians; the policy emits joint targets.
 */

export interface ArmSpec {
  l1: number;
  l2: number;
}

export type Q = [number, number];

export interface Pose {
  base: [number, number];
  elbow: [number, number];
  ee: [number, number];
}

export function fk(q: Q, arm: ArmSpec, base: [number, number] = [0, 0]): Pose {
  const elbow: [number, number] = [
    base[0] + arm.l1 * Math.cos(q[0]),
    base[1] + arm.l1 * Math.sin(q[0]),
  ];
  const ee: [number, number] = [
    elbow[0] + arm.l2 * Math.cos(q[0] + q[1]),
    elbow[1] + arm.l2 * Math.sin(q[0] + q[1]),
  ];
  return { base, elbow, ee };
}

/**
 * Analytic IK. Targets outside the annulus are clamped onto it, so dragging
 * past the workspace saturates instead of failing — same as a real controller
 * clipping to joint limits.
 */
export function ik(
  target: [number, number],
  arm: ArmSpec,
  base: [number, number] = [0, 0],
  elbowUp = true
): Q {
  const dx = target[0] - base[0];
  const dy = target[1] - base[1];
  const { l1, l2 } = arm;

  const rMax = l1 + l2 - 1e-4;
  const rMin = Math.abs(l1 - l2) + 1e-4;
  let r = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  r = Math.min(Math.max(r, rMin), rMax);

  const cos2 = (r * r - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const q1 = (elbowUp ? 1 : -1) * Math.acos(Math.min(1, Math.max(-1, cos2)));
  const q0 = ang - Math.atan2(l2 * Math.sin(q1), l1 + l2 * Math.cos(q1));

  return [q0, q1];
}

/** Shortest signed angular difference, wrapped to (−π, π]. */
export function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Smoothstep easing — stands in for the temporal profile of a demo segment. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * What the action expert emits: H future joint targets interpolating from the
 * observed configuration toward the goal. A real policy conditions on pixels
 * and language; the shape of the output — a short, smooth, time-indexed chunk
 * of absolute joint targets — is the part that matters here.
 */
export function generateChunk(qNow: Q, qGoal: Q, H: number): Q[] {
  const d0 = angDiff(qGoal[0], qNow[0]);
  const d1 = angDiff(qGoal[1], qNow[1]);
  return Array.from({ length: H }, (_, h) => {
    const s = ease((h + 1) / H);
    return [qNow[0] + d0 * s, qNow[1] + d1 * s] as Q;
  });
}
