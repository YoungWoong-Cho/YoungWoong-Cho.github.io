import { ReactNode, useId } from "react";

/* ------------------------------------------------------------------ slider */

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hint,
}: SliderProps) {
  const id = useId();
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <label
        htmlFor={id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 10,
          fontSize: 12,
          color: "var(--fg-muted)",
        }}
      >
        <span>{label}</span>
        <span className="mono" style={{ color: "var(--fg)", fontSize: 12.5 }}>
          {format ? format(value) : value}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && (
        <span style={{ fontSize: 11, color: "var(--fg-dim)", lineHeight: 1.4 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- segmented */

interface SegmentedProps<T extends string> {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {label && (
        <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>{label}</span>
      )}
      <div
        style={{
          display: "inline-flex",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: 2,
          gap: 2,
          background: "var(--bg-inset)",
        }}
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className="mono"
              style={{
                fontSize: 11.5,
                padding: "5px 11px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                background: active ? "var(--line-strong)" : "transparent",
                color: active ? "var(--fg)" : "var(--fg-dim)",
                transition: "background 0.14s ease, color 0.14s ease",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- toggle */

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        textAlign: "left",
        padding: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 30,
          height: 17,
          borderRadius: 9,
          flexShrink: 0,
          background: checked ? "var(--action)" : "var(--line-strong)",
          position: "relative",
          transition: "background 0.16s ease",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2.5,
            left: checked ? 15 : 2.5,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: checked ? "#06231f" : "var(--fg-muted)",
            transition: "left 0.16s ease",
          }}
        />
      </span>
      <span style={{ display: "grid", gap: 1 }}>
        <span style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>{label}</span>
        {hint && (
          <span style={{ fontSize: 11, color: "var(--fg-dim)", lineHeight: 1.35 }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- readout */

export function Readout({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) {
  return (
    <div style={{ display: "grid", gap: 1, minWidth: 0 }}>
      <span
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--fg-dim)", textTransform: "uppercase" }}
      >
        {label}
      </span>
      <span
        className="mono"
        style={{
          fontSize: 17,
          color: tone ?? "var(--fg)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.2,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, color: "var(--fg-dim)", marginLeft: 3 }}>
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ panel */

export function ControlPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        alignContent: "start",
        padding: 18,
        background: "var(--bg-inset)",
        borderLeft: "1px solid var(--line)",
      }}
    >
      {children}
    </div>
  );
}

export function Legend({
  items,
}: {
  items: { color: string; label: string; dashed?: boolean }[];
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px" }}>
      {items.map((it) => (
        <span
          key={it.label}
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--fg-dim)" }}
        >
          <span
            aria-hidden
            style={{
              width: 14,
              height: 0,
              borderTop: `2px ${it.dashed ? "dashed" : "solid"} ${it.color}`,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
