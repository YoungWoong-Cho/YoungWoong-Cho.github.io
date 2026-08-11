import { useState } from "react";
import { Figure } from "../ui/Figure";
import { ControlPanel, Segmented } from "../ui/Controls";

type Mode = "infer" | "train";

interface Stage {
  id: string;
  label: string;
  sub: string;
  tone: string;
  runs: string;
  inputs: string[];
  outputs: string[];
  params?: string;
  notes: string[];
  modes: Mode[];
}

const STAGES: Stage[] = [
  {
    id: "obs",
    label: "Observation",
    sub: "RGB × V  +  proprioception",
    tone: "var(--vision)",
    runs: "every control decision",
    inputs: ["V camera views, 224×224×3 (head, wrist, …)", "joint / EE state  q ∈ ℝ^d_state"],
    outputs: ["patch embeddings", "normalized state vector"],
    notes: [
      "State and action are normalized per embodiment with statistics computed over that robot's slice of the dataset — a 7-DoF arm and a humanoid do not share a scale.",
      "Which views exist is part of the embodiment definition, not something the policy discovers.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "lang",
    label: "Instruction",
    sub: "natural-language task string",
    tone: "var(--lang)",
    runs: "every control decision",
    inputs: ['"pick up the mug and set it on the tray"'],
    outputs: ["token ids → text embeddings"],
    notes: [
      "Tokenized by the backbone's own tokenizer and concatenated with the visual tokens.",
      "This is the entire reason one checkpoint covers many tasks: the instruction, not the weights, selects the behaviour.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "vlm",
    label: "Vision-language backbone",
    sub: "Eagle / PaliGemma class VLM",
    tone: "var(--lang)",
    runs: "ONCE per inference",
    params: "≈ 1–3 B",
    inputs: ["patch embeddings + text tokens"],
    outputs: ["VL token sequence  (B, N, D_vl)"],
    notes: [
      "Features are often taken from an intermediate layer rather than the final one — mid-stack representations transfer to control better than the layers specialized for next-token prediction.",
      "GR00T N1.5 freezes this trunk during action training so that language grounding survives; a backbone left unfrozen drifts toward ignoring the instruction.",
      "This is the expensive forward pass, and it runs exactly once — its output is reused by every integration step below.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "state",
    label: "Embodiment projector",
    sub: "per-robot MLP, in and out",
    tone: "var(--state)",
    runs: "every control decision",
    inputs: ["normalized q ∈ ℝ^d_state"],
    outputs: ["state token at the expert's width"],
    notes: [
      "A small input head per robot, and a matching output head that maps back to that robot's action dimension.",
      "The trunk between them stays embodiment-agnostic. That asymmetry is what lets a single set of weights serve arms with different DoF — adding a robot means adding a projector pair and fine-tuning, not retraining.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "noise",
    label: "Sample noise and τ",
    sub: "A⁰ ~ 𝒩(0, I)",
    tone: "var(--noise)",
    runs: "start of integration",
    inputs: ["—"],
    outputs: ["A^τ ∈ (B, H, D_act)", "flow time τ ∈ [0, 1]"],
    notes: [
      "At inference τ starts at 0 and the chunk is pure noise.",
      "At training τ is drawn from a distribution skewed toward the noisy end, where the field is hardest to fit and most of the error lives.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "dit",
    label: "Action expert",
    sub: "DiT blocks → velocity field v_θ",
    tone: "var(--action)",
    runs: "K× per inference",
    params: "≈ 0.1–0.5 B",
    inputs: [
      "noised chunk A^τ + τ embedding",
      "cross-attention into VL tokens + state token",
    ],
    outputs: ["velocity  v_θ(A^τ, τ, c) ∈ (B, H, D_act)"],
    notes: [
      "Self-attention runs across the H action timesteps, so the chunk is generated as one coherent trajectory rather than H independent predictions.",
      "τ enters through AdaLN modulation — the same weights behave differently at the noisy and clean ends of the path.",
      "Deliberately small. It is the only part that runs K times per control decision, so its width sets your achievable control rate.",
    ],
    modes: ["infer", "train"],
  },
  {
    id: "integ",
    label: "Euler integrator",
    sub: "τ : 0 → 1 in K steps",
    tone: "var(--action)",
    runs: "K steps, then done",
    inputs: ["v_θ at each τ"],
    outputs: ["clean action chunk  A ∈ (B, H, D_act)"],
    notes: [
      "A ← A + (1/K) · v_θ(A, τ, c), K typically 4–10.",
      "Rectified paths are close to straight by construction, which is why single-digit K works here where an early diffusion policy needed tens of denoising steps.",
    ],
    modes: ["infer"],
  },
  {
    id: "loss",
    label: "Flow-matching loss",
    sub: "regress the velocity, don't integrate it",
    tone: "var(--warn)",
    runs: "one forward pass",
    inputs: ["v_θ(A^τ, τ, c)", "target (A¹ − A⁰)"],
    outputs: ["scalar MSE"],
    notes: [
      "The training target is constant along the straight path between the noise sample and the demonstration, so there is no sampling loop and no per-step supervision to construct.",
      "One τ, one forward pass, one MSE. The K-step loop exists only at inference.",
    ],
    modes: ["train"],
  },
  {
    id: "exec",
    label: "Executor",
    sub: "chunk → joint controller",
    tone: "var(--state)",
    runs: "n steps at 30–50 Hz",
    inputs: ["A ∈ (H, D_act)"],
    outputs: ["first n ≤ H actions → robot"],
    notes: [
      "Un-normalize with the same per-embodiment statistics, then stream n steps before replanning.",
      "The unexecuted tail is discarded, or blended with the next chunk. Choosing n is the subject of figure 04.",
    ],
    modes: ["infer"],
  },
];

export function Pipeline() {
  const [mode, setMode] = useState<Mode>("infer");
  const [selected, setSelected] = useState<string>("dit");

  const visible = STAGES.filter((s) => s.modes.includes(mode));
  const active = visible.find((s) => s.id === selected) ?? visible[0];

  const loopStart = visible.findIndex((s) => s.id === "noise");
  const loopEnd = visible.findIndex((s) => s.id === "integ");
  const hasLoop = mode === "infer" && loopStart >= 0 && loopEnd >= 0;

  return (
    <Figure
      index="FIG 02"
      title="Architecture walkthrough"
      subtitle="click any block"
      stage={
        <div style={{ display: "grid", gap: 0 }}>
          {visible.map((s, i) => {
            const isSel = s.id === active.id;
            const inLoop = hasLoop && i >= loopStart && i <= loopEnd;
            return (
              <div key={s.id}>
                {i > 0 && (
                  <div
                    aria-hidden
                    style={{
                      height: 16,
                      marginLeft: 22,
                      borderLeft: `1px ${inLoop ? "dashed" : "solid"} var(--line-strong)`,
                    }}
                  />
                )}
                <button
                  onClick={() => setSelected(s.id)}
                  aria-pressed={isSel}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${isSel ? s.tone : "var(--line)"}`,
                    background: isSel
                      ? `color-mix(in srgb, ${s.tone} 11%, var(--bg-inset))`
                      : "var(--bg-inset)",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 3,
                      height: 26,
                      borderRadius: 2,
                      background: s.tone,
                      opacity: isSel ? 1 : 0.45,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ display: "grid", gap: 1, minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                    <span
                      className="mono"
                      style={{ fontSize: 11, color: "var(--fg-dim)" }}
                    >
                      {s.sub}
                    </span>
                  </span>
                  {s.runs.includes("K×") && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: s.tone,
                        border: `1px solid ${s.tone}`,
                        borderRadius: 3,
                        padding: "1px 5px",
                        flexShrink: 0,
                      }}
                    >
                      ×K
                    </span>
                  )}
                  {s.runs.includes("ONCE") && (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--fg-dim)",
                        border: "1px solid var(--line-strong)",
                        borderRadius: 3,
                        padding: "1px 5px",
                        flexShrink: 0,
                      }}
                    >
                      ×1
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {hasLoop && (
            <p
              className="mono"
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "var(--fg-dim)",
                paddingLeft: 22,
                borderLeft: "1px dashed var(--line-strong)",
              }}
            >
              ⟲ dashed span repeats K times — backbone output is cached
            </p>
          )}
        </div>
      }
      controls={
        <ControlPanel>
          <Segmented<Mode>
            label="Pass"
            value={mode}
            onChange={setMode}
            options={[
              { value: "infer", label: "inference" },
              { value: "train", label: "training" },
            ]}
          />

          <div
            style={{
              borderTop: "1px solid var(--line)",
              paddingTop: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: active.tone }}>
                {active.label}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-dim)" }}>
                runs {active.runs}
                {active.params ? ` · ${active.params} params` : ""}
              </div>
            </div>

            <ShapeList label="in" items={active.inputs} />
            <ShapeList label="out" items={active.outputs} />

            <ul style={{ display: "grid", gap: 8, paddingLeft: 0, listStyle: "none" }}>
              {active.notes.map((n, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    color: "var(--fg-muted)",
                    paddingLeft: 11,
                    borderLeft: "1px solid var(--line-strong)",
                  }}
                >
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </ControlPanel>
      }
      caption={
        <>
          The split that defines the family: a large, slow, mostly-frozen
          vision-language trunk that runs <strong style={{ color: "var(--fg-muted)" }}>once</strong>, and a
          small action expert that runs <strong style={{ color: "var(--fg-muted)" }}>K times</strong> on
          top of its cached output. Shapes and parameter counts are
          representative of published configurations rather than any single
          checkpoint.
        </>
      }
    />
  );
}

function ShapeList({ label, items }: { label: string; items: string[] }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <span
        className="mono"
        style={{ fontSize: 9.5, letterSpacing: "0.14em", color: "var(--fg-dim)", textTransform: "uppercase" }}
      >
        {label}
      </span>
      {items.map((it, i) => (
        <span
          key={i}
          className="mono"
          style={{ fontSize: 11, color: "var(--fg)", lineHeight: 1.45, wordBreak: "break-word" }}
        >
          {it}
        </span>
      ))}
    </div>
  );
}
