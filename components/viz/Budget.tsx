import { useState } from "react";
import { Figure } from "../ui/Figure";
import { ControlPanel, Readout, Slider } from "../ui/Controls";

const CTRL_HZ = 30;
const W = 660;
const HGT = 168;
const PAD_L = 8;
const PAD_R = 8;

/**
 * The real-time constraint every VLA has to satisfy: one backbone pass plus K
 * expert passes must finish before the chunk currently driving the robot runs
 * out of steps.
 */
export function Budget() {
  const [K, setK] = useState(4);
  const [tBackbone, setTBackbone] = useState(38);
  const [tExpert, setTExpert] = useState(6);
  const [n, setN] = useState(8);

  const compute = tBackbone + K * tExpert;
  const budget = (n / CTRL_HZ) * 1000;
  const headroom = budget - compute;
  const ok = headroom >= 0;

  const span = Math.max(compute, budget) * 1.12;
  const x = (ms: number) => PAD_L + (ms / span) * (W - PAD_L - PAD_R);

  const rowY = 38;
  const rowH = 26;
  const row2Y = 100;

  return (
    <Figure
      id="budget"
      index="FIG 01"
      title="The real-time constraint"
      subtitle="one control decision, in milliseconds"
      stage={
        <svg viewBox={`0 0 ${W} ${HGT}`} width="100%" role="img"
          aria-label="Compute cost of one policy call compared against the execution budget">
          <text x={PAD_L} y={20} fontSize={10} fill="var(--fg-dim)">
            COMPUTE — backbone ×1, expert ×K
          </text>

          {/* backbone block */}
          <rect x={x(0)} y={rowY} width={x(tBackbone) - x(0)} height={rowH} rx={3}
            fill="color-mix(in srgb, var(--lang) 26%, transparent)"
            stroke="var(--lang)" strokeWidth={1} />
          {x(tBackbone) - x(0) > 54 && (
            <text x={x(0) + 7} y={rowY + 17} fontSize={10} fill="var(--lang)">
              backbone
            </text>
          )}

          {/* K expert blocks */}
          {Array.from({ length: K }, (_, i) => {
            const a = x(tBackbone + i * tExpert);
            const b = x(tBackbone + (i + 1) * tExpert);
            return (
              <rect key={i} x={a + 1} y={rowY} width={Math.max(1, b - a - 2)} height={rowH} rx={2}
                fill="color-mix(in srgb, var(--action) 34%, transparent)"
                stroke="var(--action)" strokeWidth={1} />
            );
          })}
          <text x={x(compute) + 8} y={rowY + 17} fontSize={11} fill="var(--fg)"
            fontFamily="var(--font-mono), monospace">
            {compute.toFixed(0)} ms
          </text>

          {/* deadline */}
          <line x1={x(budget)} y1={rowY - 12} x2={x(budget)} y2={row2Y + rowH + 12}
            stroke={ok ? "var(--action)" : "var(--warn)"} strokeWidth={1.5}
            strokeDasharray="4 3" />

          {/* headroom / overrun */}
          <rect
            x={x(Math.min(compute, budget))}
            y={rowY}
            width={Math.abs(x(budget) - x(compute))}
            height={rowH}
            fill={ok ? "color-mix(in srgb, var(--action) 10%, transparent)" : "color-mix(in srgb, var(--warn) 24%, transparent)"}
          />

          <text x={PAD_L} y={row2Y - 12} fontSize={10} fill="var(--fg-dim)">
            BUDGET — n = {n} control ticks before the chunk is exhausted
          </text>

          {/* control tick ruler */}
          <rect x={x(0)} y={row2Y} width={x(budget) - x(0)} height={rowH} rx={3}
            fill="var(--bg-inset)" stroke="var(--line-strong)" strokeWidth={1} />
          {Array.from({ length: n }, (_, i) => (
            <line key={i} x1={x(((i + 1) / CTRL_HZ) * 1000)} y1={row2Y}
              x2={x(((i + 1) / CTRL_HZ) * 1000)} y2={row2Y + rowH}
              stroke="var(--line-strong)" strokeWidth={1} />
          ))}
          <text x={x(budget) + 8} y={row2Y + 17} fontSize={11} fill="var(--fg)"
            fontFamily="var(--font-mono), monospace">
            {budget.toFixed(0)} ms
          </text>

          <text x={PAD_L} y={HGT - 8} fontSize={11}
            fill={ok ? "var(--action)" : "var(--warn)"}
            fontFamily="var(--font-mono), monospace">
            {ok
              ? `✓ ${headroom.toFixed(0)} ms headroom — the next chunk lands in time`
              : `✗ ${(-headroom).toFixed(0)} ms over — the controller starves and the arm holds`}
          </text>
        </svg>
      }
      controls={
        <ControlPanel>
          <div style={{ display: "flex", gap: 18 }}>
            <Readout label="policy rate" value={(1000 / Math.max(compute, budget)).toFixed(1)} unit="Hz" />
            <Readout
              label="headroom"
              value={headroom.toFixed(0)}
              unit="ms"
              tone={ok ? "var(--action)" : "var(--warn)"}
            />
          </div>

          <Slider label="K — integration steps" value={K} min={1} max={16} onChange={setK} />
          <Slider
            label="n — steps before replan"
            value={n}
            min={1}
            max={32}
            onChange={setN}
          />
          <Slider
            label="backbone pass"
            value={tBackbone}
            min={5}
            max={120}
            onChange={setTBackbone}
            format={(v) => `${v} ms`}
            hint="Runs once. The dominant fixed cost."
          />
          <Slider
            label="expert pass"
            value={tExpert}
            min={1}
            max={30}
            onChange={setTExpert}
            format={(v) => `${v} ms`}
            hint="Runs K times. Why the expert is kept small."
          />
        </ControlPanel>
      }
      caption={
        <>
          Every design choice downstream is really a move inside this budget.
          Freezing and caching the backbone takes its cost off the K-multiplied
          path; rectified flow shrinks K; chunking buys a wider budget by
          committing to n steps of open-loop execution. Defaults here are
          plausible for a mid-size VLA on a single accelerator — set them to
          your own measurements.
        </>
      }
    />
  );
}
