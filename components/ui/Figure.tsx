import { ReactNode } from "react";

/**
 * Standard container for every interactive figure: a labelled header, a stage
 * on the left and a control column on the right that collapses underneath on
 * narrow viewports.
 */
export function Figure({
  id,
  index,
  title,
  subtitle,
  stage,
  controls,
  caption,
}: {
  id?: string;
  index: string;
  title: string;
  subtitle?: string;
  stage: ReactNode;
  controls?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <figure
      id={id}
      style={{
        margin: 0,
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--bg-panel)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
          padding: "13px 18px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg-raised)",
        }}
      >
        <span className="mono" style={{ fontSize: 11, color: "var(--action)" }}>
          {index}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {title}
        </span>
        {subtitle && (
          <span style={{ fontSize: 12, color: "var(--fg-dim)" }}>{subtitle}</span>
        )}
      </header>

      <div className="figure-body">
        <div style={{ minWidth: 0, padding: 18 }}>{stage}</div>
        {controls}
      </div>

      {caption && (
        <figcaption
          style={{
            padding: "12px 18px",
            borderTop: "1px solid var(--line)",
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--fg-dim)",
            background: "var(--bg-inset)",
          }}
        >
          {caption}
        </figcaption>
      )}

      <style jsx>{`
        .figure-body {
          display: grid;
          grid-template-columns: 1fr 264px;
          align-items: stretch;
        }
        @media (max-width: 860px) {
          .figure-body {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </figure>
  );
}
