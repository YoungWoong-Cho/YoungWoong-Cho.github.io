// Interactive cross-embodiment hand viewer (client-only; load with
// next/dynamic and { ssr: false }). A canonical human hand defines five
// palm-frame fingertip targets; seven robot hands reach them via per-hand IK.

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HandsScene, webglAvailable, type SceneState, type SceneStatus } from "@/lib/hands/scene";
import styles from "./HandsInterface.module.css";

const PRESETS: { id: string; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "pinch", label: "Pinch" },
  { id: "tripod", label: "Tripod" },
  { id: "power", label: "Power grasp" },
  { id: "point", label: "Point" },
  { id: "thumbs_up", label: "Thumbs-up" },
];

const HAND_NAMES = [
  "Shadow Hand",
  "Sharpa Wave",
  "Wuji Hand",
  "Wuji Hand 2",
  "Inspire RH56",
  "Allegro Hand V4",
  "LEAP Hand",
];

export interface HandsInterfaceProps {
  /** Canvas height in px on wide screens (narrow screens grow taller). */
  height?: number;
  className?: string;
  /** Override the manifest location (default /hands/hands.json). */
  manifestUrl?: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export default function HandsInterface({ height = 460, className, manifestUrl }: HandsInterfaceProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HandsScene | null>(null);
  const [state, setState] = useState<SceneState>({ preset: "pinch", closure: 0, autoplay: false });
  const [status, setStatus] = useState<SceneStatus | null>(null);
  const [mode, setMode] = useState<"init" | "ready" | "nowebgl" | "error">("init");

  useEffect(() => {
    const stage = stageRef.current;
    const labels = labelsRef.current;
    if (!stage || !labels) return;
    if (!webglAvailable()) {
      setMode("nowebgl");
      return;
    }
    let scene: HandsScene;
    try {
      scene = new HandsScene(stage, labels, {
        reducedMotion: prefersReducedMotion(),
        onState: setState,
        onStatus: setStatus,
      });
    } catch (e) {
      console.warn("hands: WebGL initialisation failed", e);
      setMode("nowebgl");
      return;
    }
    sceneRef.current = scene;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __hands?: HandsScene }).__hands = scene;
    setMode("ready");
    scene.load(manifestUrl).catch((e: unknown) => {
      if ((e as { name?: string })?.name === "AbortError") return;
      console.warn("hands: failed to load", e);
      setMode("error");
    });
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, [manifestUrl]);

  const loading = status && status.loaded + status.failed.length < status.total;
  const rootStyle = { "--hands-h": `${height}px` } as CSSProperties;

  return (
    <figure className={[styles.root, className].filter(Boolean).join(" ")} style={rootStyle}>
      <div className={styles.stage} ref={stageRef}>
        <div className={styles.labels} ref={labelsRef} aria-hidden="true" />
        {mode === "ready" && (
          <>
            <div className={styles.status} aria-live="polite">
              {loading ? `loading hand models · ${status.loaded}/${status.total}` : ""}
            </div>
            <div className={styles.hint}>drag to rotate</div>
          </>
        )}
        {(mode === "nowebgl" || mode === "error") && (
          <div className={styles.fallback}>
            <strong>
              {mode === "nowebgl"
                ? "This interactive 3D view needs WebGL, which is unavailable in this browser."
                : "The hand models could not be loaded."}
            </strong>
            <span>
              It shows one human hand driving seven robot hands ({HAND_NAMES.join(", ")}) through the same
              wrist pose and five palm-frame fingertip targets, each decoded to its own joints by per-hand
              inverse kinematics.
            </span>
          </div>
        )}
      </div>

      {mode === "ready" && (
        <div className={styles.bar}>
          <div className={styles.presets} role="group" aria-label="Grasp preset">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={styles.preset}
                aria-pressed={state.preset === p.id}
                onClick={() => sceneRef.current?.setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className={styles.closure}>
            <span>closure</span>
            <input
              aria-label="Grasp closure"
              className={styles.slider}
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.closure}
              aria-valuetext={`${Math.round(state.closure * 100)}% towards ${state.preset}`}
              onChange={(e) => sceneRef.current?.setClosure(Number(e.currentTarget.value))}
            />
            <span className={styles.value} aria-hidden="true">
              {state.closure.toFixed(2)}
            </span>
          </label>
          <button
            type="button"
            className={styles.play}
            aria-label="Auto-play"
            aria-pressed={state.autoplay}
            onClick={() => sceneRef.current?.setAutoplay(!state.autoplay)}
          >
            {state.autoplay ? "❚❚ pause" : "▶ auto-play"}
          </button>
        </div>
      )}
      <figcaption className={styles.caption}>
        Same wrist + fingertip targets <b>→</b> per-hand IK <b>→</b> 7 different hands ·{" "}
        <a className={styles.credits} href="/hands/CREDITS.json">
          hand models: sources &amp; licenses
        </a>
      </figcaption>
    </figure>
  );
}
