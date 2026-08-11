import { useCallback, useEffect, useRef, useState } from "react";
import { ArmSpec, Q, fk, generateChunk, ik } from "../../lib/arm";
import { Figure } from "../ui/Figure";
import { ControlPanel, Readout, Slider, Toggle } from "../ui/Controls";

const CTRL_HZ = 30;
const W = 660;
const HGT = 320;
const BASE: [number, number] = [150, 250];
const ARM: ArmSpec = { l1: 95, l2: 85 };
const REACH = ARM.l1 + ARM.l2;

const SWEEP_C: [number, number] = [225, 150];
const SWEEP_R: [number, number] = [62, 44];

interface ChunkRec {
  id: number;
  /** control tick whose observation produced this chunk */
  createdTick: number;
  /** control tick at which it becomes executable */
  availTick: number;
  actions: Q[];
  /** where the target was when the observation was taken */
  obsTarget: [number, number];
}

interface Frame {
  q: Q;
  tick: number;
  target: [number, number];
  chunks: ChunkRec[];
  activeId: number | null;
  staleness: number;
}

const INITIAL_Q: Q = ik([300, 150], ARM, BASE, false);

export function PolicyLoop() {
  const [H, setH] = useState(16);
  const [stride, setStride] = useState(8);
  const [latency, setLatency] = useState(3);
  const [ensemble, setEnsemble] = useState(false);
  const [sweep, setSweep] = useState(true);

  const [frame, setFrame] = useState<Frame>({
    q: INITIAL_Q,
    tick: 0,
    target: [300, 150],
    chunks: [],
    activeId: null,
    staleness: 0,
  });

  const svgRef = useRef<SVGSVGElement>(null);
  const cfg = useRef({ H, stride, latency, ensemble, sweep });
  cfg.current = { H, stride, latency, ensemble, sweep };

  const sim = useRef({
    q: INITIAL_Q,
    tick: 0,
    target: [300, 150] as [number, number],
    chunks: [] as ChunkRec[],
    lastPlan: -999,
    nextId: 1,
  });

  const dragging = useRef(false);

  const toViewBox = useCallback((cx: number, cy: number): [number, number] => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return [cx, cy];
    return [((cx - r.left) / r.width) * W, ((cy - r.top) / r.height) * HGT];
  }, []);

  /* ------------------------------------------------ fixed-rate control loop */
  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let prev = 0;
    const dt = 1 / CTRL_HZ;

    const step = () => {
      const s = sim.current;
      const { H: h, stride: st, latency: lat, ensemble: ens, sweep: sw } = cfg.current;

      if (sw && !dragging.current) {
        const time = s.tick / CTRL_HZ;
        s.target = [
          SWEEP_C[0] + SWEEP_R[0] * Math.cos(time * 0.9),
          SWEEP_C[1] + SWEEP_R[1] * Math.sin(time * 1.37),
        ];
      }

      // --- inference tick: observe, run the policy, emit a chunk ---
      if (s.tick - s.lastPlan >= st) {
        s.lastPlan = s.tick;
        const qGoal = ik(s.target, ARM, BASE, false);
        s.chunks.push({
          id: s.nextId++,
          createdTick: s.tick,
          availTick: s.tick + lat,
          actions: generateChunk(s.q, qGoal, h),
          obsTarget: [s.target[0], s.target[1]],
        });
        if (s.chunks.length > 6) s.chunks.shift();
      }

      // --- control tick: pull the action for this tick out of the chunk(s) ---
      const usable = s.chunks.filter(
        (c) => s.tick >= c.availTick && s.tick < c.availTick + h
      );

      let activeId: number | null = null;
      let staleness = 0;

      if (usable.length > 0) {
        if (ens) {
          // ACT-style temporal ensembling: exponentially weight newer chunks
          let wsum = 0;
          let a0 = 0;
          let a1 = 0;
          usable.forEach((c, i) => {
            const age = usable.length - 1 - i;
            const w = Math.exp(-0.45 * age);
            const idx = s.tick - c.availTick;
            a0 += w * c.actions[idx][0];
            a1 += w * c.actions[idx][1];
            wsum += w;
          });
          s.q = [a0 / wsum, a1 / wsum];
          const newest = usable[usable.length - 1];
          activeId = newest.id;
          staleness = s.tick - newest.createdTick;
        } else {
          const c = usable[usable.length - 1];
          s.q = c.actions[s.tick - c.availTick];
          activeId = c.id;
          staleness = s.tick - c.createdTick;
        }
      }

      s.tick += 1;

      setFrame({
        q: s.q,
        tick: s.tick,
        target: [s.target[0], s.target[1]],
        chunks: s.chunks.slice(),
        activeId,
        staleness,
      });
    };

    const loop = (now: number) => {
      if (!prev) prev = now;
      acc += Math.min((now - prev) / 1000, 0.25);
      prev = now;
      while (acc >= dt) {
        step();
        acc -= dt;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* --------------------------------------------------------------- pointer */
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    setSweep(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    sim.current.target = toViewBox(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    sim.current.target = toViewBox(e.clientX, e.clientY);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const pose = fk(frame.q, ARM, BASE);
  const active = frame.chunks.find((c) => c.id === frame.activeId) ?? null;

  const trackErr = Math.hypot(
    pose.ee[0] - frame.target[0],
    pose.ee[1] - frame.target[1]
  );

  // ghost poses for the remainder of the active chunk
  const ghosts: Q[] = [];
  if (active) {
    const idx = frame.tick - active.availTick;
    for (let i = idx; i < active.actions.length; i += 2) ghosts.push(active.actions[i]);
  }

  const stalenessMs = (frame.staleness / CTRL_HZ) * 1000;
  const reactionMs = ((stride + latency) / CTRL_HZ) * 1000;

  return (
    <Figure
      id="loop"
      index="FIG 04"
      title="The policy loop"
      subtitle="drag the target"
      stage={
        <div style={{ display: "grid", gap: 10 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${HGT}`}
            width="100%"
            style={{ cursor: dragging.current ? "grabbing" : "crosshair", userSelect: "none" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            role="img"
            aria-label="A two-link arm executing action chunks toward a draggable target"
          >
            {/* workspace */}
            <circle cx={BASE[0]} cy={BASE[1]} r={REACH} fill="none"
              stroke="var(--line-soft)" strokeWidth={1} strokeDasharray="3 5" />
            <line x1={0} y1={BASE[1]} x2={W} y2={BASE[1]} stroke="var(--line-soft)" strokeWidth={1} />

            {/* stale observation the active chunk was computed from */}
            {active && (
              <g opacity={0.75}>
                <line
                  x1={active.obsTarget[0]} y1={active.obsTarget[1]}
                  x2={frame.target[0]} y2={frame.target[1]}
                  stroke="var(--warn)" strokeWidth={1} strokeDasharray="2 3"
                />
                <circle cx={active.obsTarget[0]} cy={active.obsTarget[1]} r={4}
                  fill="none" stroke="var(--warn)" strokeWidth={1.2} />
              </g>
            )}

            {/* planned remainder of the chunk */}
            {ghosts.map((gq, i) => {
              const p = fk(gq, ARM, BASE);
              return (
                <g key={i} opacity={0.1 + 0.16 * (1 - i / Math.max(ghosts.length, 1))}>
                  <polyline
                    points={`${p.base[0]},${p.base[1]} ${p.elbow[0]},${p.elbow[1]} ${p.ee[0]},${p.ee[1]}`}
                    fill="none" stroke="var(--action)" strokeWidth={3}
                    strokeLinecap="round" strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* target */}
            <g>
              <circle cx={frame.target[0]} cy={frame.target[1]} r={11} fill="none"
                stroke="var(--vision)" strokeWidth={1} opacity={0.5} />
              <line x1={frame.target[0] - 7} y1={frame.target[1]} x2={frame.target[0] + 7}
                y2={frame.target[1]} stroke="var(--vision)" strokeWidth={1.4} />
              <line x1={frame.target[0]} y1={frame.target[1] - 7} x2={frame.target[0]}
                y2={frame.target[1] + 7} stroke="var(--vision)" strokeWidth={1.4} />
            </g>

            {/* arm */}
            <polyline
              points={`${pose.base[0]},${pose.base[1]} ${pose.elbow[0]},${pose.elbow[1]} ${pose.ee[0]},${pose.ee[1]}`}
              fill="none" stroke="var(--fg)" strokeWidth={7}
              strokeLinecap="round" strokeLinejoin="round"
            />
            <circle cx={pose.base[0]} cy={pose.base[1]} r={9} fill="var(--bg-panel)"
              stroke="var(--fg-muted)" strokeWidth={2} />
            <circle cx={pose.elbow[0]} cy={pose.elbow[1]} r={5} fill="var(--bg-panel)"
              stroke="var(--fg-muted)" strokeWidth={2} />
            <circle cx={pose.ee[0]} cy={pose.ee[1]} r={5.5} fill="var(--action)" />

            <text x={W - 12} y={20} textAnchor="end" fontSize={10} fill="var(--fg-dim)">
              control {CTRL_HZ} Hz · policy {(CTRL_HZ / stride).toFixed(1)} Hz
            </text>
          </svg>

          <ChunkTimeline
            chunks={frame.chunks}
            tick={frame.tick}
            H={H}
            activeId={frame.activeId}
            ensemble={ensemble}
          />
        </div>
      }
      controls={
        <ControlPanel>
          <div style={{ display: "flex", gap: 18 }}>
            <Readout
              label="tracking err"
              value={trackErr.toFixed(0)}
              unit="px"
              tone={trackErr > 40 ? "var(--warn)" : "var(--fg)"}
            />
            <Readout
              label="staleness"
              value={stalenessMs.toFixed(0)}
              unit="ms"
              tone={stalenessMs > 300 ? "var(--warn)" : "var(--fg)"}
            />
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            <Readout label="replan" value={((stride / CTRL_HZ) * 1000).toFixed(0)} unit="ms" />
            <Readout label="worst react" value={reactionMs.toFixed(0)} unit="ms" />
          </div>

          <Slider
            label="H — chunk horizon"
            value={H}
            min={4}
            max={40}
            onChange={(v) => {
              setH(v);
              if (stride > v) setStride(v);
            }}
            hint="How many future steps the expert emits in one shot."
          />

          <Slider
            label="n — steps executed"
            value={stride}
            min={1}
            max={H}
            onChange={setStride}
            hint={`Replan every n steps. ${
              H > stride
                ? `${(((H - stride) / H) * 100).toFixed(0)}% of each chunk is thrown away.`
                : "The whole chunk is consumed before replanning."
            }`}
          />

          <Slider
            label="inference latency"
            value={latency}
            min={0}
            max={12}
            onChange={setLatency}
            format={(v) => `${((v / CTRL_HZ) * 1000).toFixed(0)} ms`}
            hint="Wall-clock cost of the backbone plus K expert passes."
          />

          <Toggle
            label="temporal ensembling"
            checked={ensemble}
            onChange={setEnsemble}
            hint="Average overlapping chunks instead of hard-switching."
          />

          <Toggle
            label="auto-sweep target"
            checked={sweep}
            onChange={setSweep}
            hint="Off while you drag."
          />
        </ControlPanel>
      }
      caption={
        <>
          Two clocks, not one. The controller wants an action every{" "}
          <code className="inline">{(1000 / CTRL_HZ).toFixed(0)} ms</code>; the
          policy can only answer every{" "}
          <code className="inline">{((stride / CTRL_HZ) * 1000).toFixed(0)} ms</code>.
          Chunking covers the gap by predicting ahead — and pays for it in
          staleness, which you can see as the red tether between where the
          target is now and where it was when the executing chunk was computed.
          Raise <code className="inline">n</code> and the arm goes smooth and
          deaf; lower it and the arm reacts but the policy runs hot.
        </>
      }
    />
  );
}

/* -------------------------------------------------------------- timeline */

function ChunkTimeline({
  chunks,
  tick,
  H,
  activeId,
  ensemble,
}: {
  chunks: ChunkRec[];
  tick: number;
  H: number;
  activeId: number | null;
  ensemble: boolean;
}) {
  const w = 660;
  const rowH = 15;
  const rows = 6;
  const h = rows * rowH + 26;
  const window = Math.max(60, H * 2 + 20);
  const t0 = tick - window * 0.72;

  const x = (t: number) => ((t - t0) / window) * w;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img"
      aria-label="Timeline of overlapping action chunks against the control tick">
      {/* control ticks */}
      {Array.from({ length: Math.ceil(window / 5) + 1 }, (_, i) => {
        const t = Math.ceil(t0 / 5) * 5 + i * 5;
        return (
          <line key={t} x1={x(t)} y1={h - 16} x2={x(t)} y2={h - 12}
            stroke="var(--line-strong)" strokeWidth={1} />
        );
      })}
      <line x1={0} y1={h - 16} x2={w} y2={h - 16} stroke="var(--line)" strokeWidth={1} />
      <text x={2} y={h - 3} fontSize={9} fill="var(--fg-dim)">
        control ticks @ 30 Hz
      </text>

      {chunks.map((c, i) => {
        const row = i;
        const y = row * rowH + 3;
        const isActive = c.id === activeId;
        const next = chunks[i + 1];
        const execEnd = next ? Math.min(next.availTick, c.availTick + H) : Math.min(tick + 1, c.availTick + H);
        const execStart = c.availTick;

        return (
          <g key={c.id}>
            {/* latency: observation taken → chunk usable */}
            <line x1={x(c.createdTick)} y1={y + 5.5} x2={x(c.availTick)} y2={y + 5.5}
              stroke="var(--warn)" strokeWidth={1} strokeDasharray="2 2" />
            <circle cx={x(c.createdTick)} cy={y + 5.5} r={2} fill="var(--warn)" />

            {/* full predicted horizon */}
            <rect x={x(c.availTick)} y={y} width={Math.max(0, x(c.availTick + H) - x(c.availTick))}
              height={11} rx={2}
              fill={ensemble ? "color-mix(in srgb, var(--action) 16%, transparent)" : "var(--line-soft)"}
              stroke={isActive ? "var(--action)" : "var(--line-strong)"} strokeWidth={1} />

            {/* portion actually driving the robot */}
            <rect x={x(execStart)} y={y} width={Math.max(0, x(execEnd) - x(execStart))}
              height={11} rx={2}
              fill={isActive ? "var(--action)" : "color-mix(in srgb, var(--action) 42%, transparent)"} />
          </g>
        );
      })}

      {/* now */}
      <line x1={x(tick)} y1={0} x2={x(tick)} y2={h - 10} stroke="var(--fg)" strokeWidth={1} />
      <text x={x(tick) + 4} y={h - 20} fontSize={9} fill="var(--fg)">
        now
      </text>
    </svg>
  );
}
