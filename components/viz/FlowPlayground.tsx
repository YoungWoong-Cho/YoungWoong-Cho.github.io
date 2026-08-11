import { useEffect, useMemo, useRef, useState } from "react";
import { Chunk, integrate } from "../../lib/flow";
import { Figure } from "../ui/Figure";
import { ControlPanel, Legend, Readout, Slider } from "../ui/Controls";

const H = 16;
const D = 6;

const W = 660;
const HGT = 300;
const PAD = { t: 16, r: 14, b: 26, l: 34 };

/** One hue ramp: every line here is an action dimension, not a different role. */
const DIM_COLORS = Array.from({ length: D }, (_, i) => {
  const f = i / (D - 1);
  return `hsl(${170 + f * 34}, ${62 - f * 8}%, ${70 - f * 14}%)`;
});

function lerpChunks(a: Chunk, b: Chunk, f: number): Chunk {
  return a.map((row, h) => row.map((x, d) => x + (b[h][d] - x) * f));
}

export function FlowPlayground() {
  const [K, setK] = useState(4);
  const [curvature, setCurvature] = useState(0.55);
  const [noiseScale, setNoiseScale] = useState(1);
  const [seed, setSeed] = useState(3);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);

  const run = useMemo(
    () => integrate({ H, D, K, curvature, noiseScale, seed }),
    [K, curvature, noiseScale, seed]
  );

  /** error as a function of step count, holding everything else fixed */
  const sweep = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        k: i + 1,
        err: integrate({ H, D, K: i + 1, curvature, noiseScale, seed }).error,
      })),
    [curvature, noiseScale, seed]
  );

  /* ---- animation: sweep τ from 0 to 1, hold, repeat ---- */
  const raf = useRef<number>(0);
  const last = useRef<number>(0);
  useEffect(() => {
    if (!playing) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setT(1);
      return;
    }

    last.current = 0;
    const tick = (now: number) => {
      if (!last.current) last.current = now;
      const dt = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;
      setT((prev) => (prev >= 1.35 ? 0 : prev + dt * 0.42));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const tClamped = Math.min(t, 1);

  /* ---- current state along the Euler path ---- */
  const current = useMemo(() => {
    const pos = tClamped * K;
    const k = Math.min(Math.floor(pos), K - 1);
    const frac = K === 0 ? 0 : pos - k;
    return tClamped >= 1
      ? run.states[K]
      : lerpChunks(run.states[k], run.states[k + 1], frac);
  }, [tClamped, K, run]);

  /* ---- stable y-domain across the whole integration ---- */
  const domain = useMemo(() => {
    let m = 1.2;
    for (const st of run.states)
      for (const row of st) for (const v of row) m = Math.max(m, Math.abs(v));
    return Math.ceil(m * 10) / 10;
  }, [run]);

  const x = (h: number) => PAD.l + (h / (H - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) =>
    PAD.t + ((domain - v) / (2 * domain)) * (HGT - PAD.t - PAD.b);

  const poly = (c: Chunk, d: number) =>
    c.map((row, h) => `${x(h).toFixed(1)},${y(row[d]).toFixed(1)}`).join(" ");

  const liveErr = useMemo(() => {
    let acc = 0;
    for (let h = 0; h < H; h++)
      for (let d = 0; d < D; d++)
        acc += Math.abs(current[h][d] - run.target[h][d]);
    return acc / (H * D);
  }, [current, run.target]);

  const errTone =
    run.error < 0.03 ? "var(--action)" : run.error < 0.12 ? "var(--vision)" : "var(--warn)";

  return (
    <Figure
      id="flow"
      index="FIG 03"
      title="Flow-matching playground"
      subtitle={`H = ${H} steps × D = ${D} dims`}
      stage={
        <div style={{ display: "grid", gap: 12 }}>
          <svg viewBox={`0 0 ${W} ${HGT}`} width="100%" role="img"
            aria-label="Action chunk trajectories denoising from Gaussian noise to a smooth trajectory">
            {/* zero line + frame */}
            <line x1={PAD.l} y1={y(0)} x2={W - PAD.r} y2={y(0)}
              stroke="var(--line-strong)" strokeWidth={1} />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={HGT - PAD.b}
              stroke="var(--line)" strokeWidth={1} />

            <text x={PAD.l - 7} y={y(domain) + 4} textAnchor="end"
              fontSize={9} fill="var(--fg-dim)">
              +{domain.toFixed(1)}
            </text>
            <text x={PAD.l - 7} y={y(-domain) + 4} textAnchor="end"
              fontSize={9} fill="var(--fg-dim)">
              −{domain.toFixed(1)}
            </text>
            <text x={PAD.l} y={HGT - 8} fontSize={9} fill="var(--fg-dim)">
              t
            </text>
            <text x={W - PAD.r} y={HGT - 8} textAnchor="end" fontSize={9} fill="var(--fg-dim)">
              t + {H - 1}
            </text>

            {/* target chunk A¹ */}
            {Array.from({ length: D }, (_, d) => (
              <polyline key={`tgt-${d}`} points={poly(run.target, d)} fill="none"
                stroke={DIM_COLORS[d]} strokeWidth={1} strokeDasharray="2 3"
                opacity={0.34} />
            ))}

            {/* current state A^τ */}
            {Array.from({ length: D }, (_, d) => (
              <polyline key={`cur-${d}`} points={poly(current, d)} fill="none"
                stroke={DIM_COLORS[d]} strokeWidth={1.9} strokeLinejoin="round"
                strokeLinecap="round" />
            ))}

            {/* per-timestep markers on the first dimension, to read the chunk as discrete */}
            {current.map((row, h) => (
              <circle key={h} cx={x(h)} cy={y(row[0])} r={2} fill={DIM_COLORS[0]} />
            ))}

            {/* τ progress bar */}
            <rect x={PAD.l} y={4} width={W - PAD.l - PAD.r} height={2}
              fill="var(--line)" />
            <rect x={PAD.l} y={4} width={(W - PAD.l - PAD.r) * tClamped} height={2}
              fill="var(--action)" />
          </svg>

          <Legend
            items={[
              { color: DIM_COLORS[1], label: "A^τ — current chunk" },
              { color: DIM_COLORS[1], label: "A¹ — demonstration", dashed: true },
            ]}
          />
        </div>
      }
      controls={
        <ControlPanel>
          <div style={{ display: "flex", gap: 18 }}>
            <Readout label="τ" value={tClamped.toFixed(2)} />
            <Readout label="step" value={`${Math.min(Math.ceil(tClamped * K), K)}/${K}`} />
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <Readout label="live err" value={liveErr.toFixed(3)} />
            <Readout label="final err" value={run.error.toFixed(3)} tone={errTone} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="mono"
              style={{
                flex: 1,
                fontSize: 11.5,
                padding: "6px 0",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--fg)",
              }}
            >
              {playing ? "❙❙ pause" : "▶ play"}
            </button>
            <button
              onClick={() => {
                setSeed((s) => s + 1);
                setT(0);
              }}
              className="mono"
              style={{
                flex: 1,
                fontSize: 11.5,
                padding: "6px 0",
                border: "1px solid var(--line-strong)",
                borderRadius: "var(--radius-sm)",
                color: "var(--fg-muted)",
              }}
            >
              ↻ resample A⁰
            </button>
          </div>

          <Slider
            label="τ (scrub)"
            value={tClamped}
            min={0}
            max={1}
            step={0.001}
            onChange={(v) => {
              setPlaying(false);
              setT(v);
            }}
            format={(v) => v.toFixed(2)}
          />

          <Slider
            label="K — integration steps"
            value={K}
            min={1}
            max={16}
            onChange={setK}
            hint="Euler steps from noise to action. Each one is a full pass through the action expert."
          />

          <Slider
            label="field curvature"
            value={curvature}
            min={0}
            max={1}
            step={0.01}
            onChange={setCurvature}
            format={(v) => v.toFixed(2)}
            hint="How far v_θ departs from a straight path. At 0, one Euler step is exact."
          />

          <Slider
            label="noise scale σ"
            value={noiseScale}
            min={0.2}
            max={2}
            step={0.05}
            onChange={setNoiseScale}
            format={(v) => v.toFixed(2)}
          />

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
            <span
              className="mono"
              style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--fg-dim)", textTransform: "uppercase" }}
            >
              final error vs K
            </span>
            <ErrorSweep sweep={sweep} K={K} onPick={setK} />
          </div>
        </ControlPanel>
      }
      caption={
        <>
          Training never runs this loop — it regresses{" "}
          <code className="inline">v_θ</code> against the constant target{" "}
          <code className="inline">A¹ − A⁰</code> in a single pass. The loop is
          an inference-time cost, and the curvature slider is what buys it:
          drive curvature to zero and one step is exact, which is the limit that
          rectified flows are engineered toward and the reason production
          policies get away with K in the single digits.
        </>
      }
    />
  );
}

function ErrorSweep({
  sweep,
  K,
  onPick,
}: {
  sweep: { k: number; err: number }[];
  K: number;
  onPick: (k: number) => void;
}) {
  const w = 224;
  const h = 62;
  const max = Math.max(...sweep.map((s) => s.err), 0.02);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ marginTop: 6 }} role="img"
      aria-label="Final error as a function of integration step count">
      {sweep.map((s) => {
        const bw = w / sweep.length;
        const bh = Math.max(1, (s.err / max) * (h - 14));
        const sel = s.k === K;
        return (
          <g key={s.k} onClick={() => onPick(s.k)} style={{ cursor: "pointer" }}>
            <rect x={s.k * bw - bw + 1} y={0} width={bw - 2} height={h} fill="transparent" />
            <rect
              x={s.k * bw - bw + 1}
              y={h - 12 - bh}
              width={bw - 2}
              height={bh}
              fill={sel ? "var(--action)" : "var(--line-strong)"}
              rx={1}
            />
            {sel && (
              <text x={s.k * bw - bw / 2} y={h - 2} textAnchor="middle" fontSize={8}
                fill="var(--action)">
                {s.k}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
