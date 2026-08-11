/**
 * Flow matching over action chunks — the generative core of a modern VLA
 * (π0, GR00T N1.5 and friends).
 *
 * An action chunk is A ∈ ℝ^(H×D): H future timesteps of a D-dimensional
 * normalized action. Training regresses a velocity field; inference integrates
 * it from noise at τ=0 to a clean chunk at τ=1.
 *
 * Everything here is deterministic given a seed so that the server-rendered
 * markup and the hydrated client agree.
 */

export type Chunk = number[][]; // [H][D]

/** Small, fast, seedable PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
function gauss(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * A¹ — the "expert" chunk the model is trying to produce. Teleop demonstrations
 * are smooth and band-limited, so a couple of sinusoids per dimension is a fair
 * stand-in for a real demonstration segment.
 */
export function targetChunk(H: number, D: number, seed = 7): Chunk {
  const rand = mulberry32(seed);
  const dims = Array.from({ length: D }, () => ({
    bias: (rand() - 0.5) * 0.55,
    a1: 0.34 + rand() * 0.42,
    f1: 0.55 + rand() * 0.75,
    p1: rand() * Math.PI * 2,
    a2: 0.1 + rand() * 0.2,
    f2: 1.3 + rand() * 1.3,
    p2: rand() * Math.PI * 2,
  }));

  return Array.from({ length: H }, (_, h) => {
    const s = H === 1 ? 0 : h / (H - 1);
    return dims.map(
      (p) =>
        p.bias +
        p.a1 * Math.sin(2 * Math.PI * p.f1 * s + p.p1) +
        p.a2 * Math.sin(2 * Math.PI * p.f2 * s + p.p2)
    );
  });
}

/** A⁰ ~ 𝒩(0, σ²I) — the sample the integrator starts from. */
export function noiseChunk(H: number, D: number, seed: number, scale = 1): Chunk {
  const rand = mulberry32(seed * 2654435761);
  return Array.from({ length: H }, () =>
    Array.from({ length: D }, () => gauss(rand) * scale)
  );
}

/**
 * The learned velocity field v_θ(A^τ, τ, c), stood in for by an analytic one.
 *
 * The straight-line (rectified) component points from where we are to the data
 * sample. A real network's field is not perfectly straight, so `curvature` adds
 * a rotational component that decays as τ→1 — this is the entire reason step
 * count K matters. Set curvature to 0 and a single Euler step is exact.
 */
function velocity(A: Chunk, A1: Chunk, tau: number, curvature: number): Chunk {
  const s = Math.max(1 - tau, 1e-6);
  const theta = curvature * s * Math.PI * 0.5;
  const c = Math.cos(theta);
  const sn = Math.sin(theta);

  return A.map((row, h) => {
    const res = row.map((x, d) => A1[h][d] - x);
    const out = res.slice();
    if (curvature !== 0) {
      // rotate residuals within adjacent dimension pairs
      for (let d = 0; d + 1 < res.length; d += 2) {
        out[d] = c * res[d] - sn * res[d + 1];
        out[d + 1] = sn * res[d] + c * res[d + 1];
      }
    }
    return out.map((x) => x / s);
  });
}

export interface IntegrateOpts {
  H: number;
  D: number;
  K: number;
  curvature: number;
  noiseScale: number;
  seed: number;
}

export interface IntegrateResult {
  /** τ value at each stored state, length K+1, from 0 to 1 */
  taus: number[];
  /** A^τ at each τ, length K+1 */
  states: Chunk[];
  /** the data sample the field points toward */
  target: Chunk;
  /** mean |A_final − A¹| over all H·D entries */
  error: number;
}

/** Euler-integrate dA/dτ = v_θ(A, τ) from τ=0 to τ=1 in K steps. */
export function integrate(opts: IntegrateOpts): IntegrateResult {
  const { H, D, K, curvature, noiseScale, seed } = opts;
  const target = targetChunk(H, D);

  let A = noiseChunk(H, D, seed, noiseScale);
  const states: Chunk[] = [A];
  const taus: number[] = [0];
  const dt = 1 / K;

  for (let k = 0; k < K; k++) {
    const tau = k * dt;
    const v = velocity(A, target, tau, curvature);
    A = A.map((row, h) => row.map((x, d) => x + dt * v[h][d]));
    states.push(A);
    taus.push(Math.min((k + 1) * dt, 1));
  }

  let acc = 0;
  for (let h = 0; h < H; h++) {
    for (let d = 0; d < D; d++) acc += Math.abs(A[h][d] - target[h][d]);
  }

  return { taus, states, target, error: acc / (H * D) };
}

/** Straight-line probability path A^τ = (1−τ)·A⁰ + τ·A¹, for reference. */
export function lerpChunk(A0: Chunk, A1: Chunk, tau: number): Chunk {
  return A0.map((row, h) => row.map((x, d) => (1 - tau) * x + tau * A1[h][d]));
}
