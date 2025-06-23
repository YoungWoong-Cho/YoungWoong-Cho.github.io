"use client";

import { animate } from "motion";
import { splitText } from "motion-plus";
import { useEffect, useRef } from "react";

interface SplitHeadingProps {
  text: string;
}

export default function SplitHeading({ text }: SplitHeadingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (!containerRef.current) return;
      containerRef.current.style.visibility = "visible";

      const lines = containerRef.current.querySelectorAll<HTMLElement>(".split-line");

      lines.forEach((lineEl, lineIndex) => {
        const { words } = splitText(lineEl);

        animate(
          words,
          { opacity: [0, 1], y: [10, 0] },
          {
            type: "spring",
            duration: 2,
            bounce: 0,
            delay: (wordIndex) => lineIndex * 0.4 + wordIndex * 0.05,
          }
        );
      });
    });
  }, []);

  return (
    <div ref={containerRef} style={{ visibility: "hidden" }}>
      <h1
        style={{
          fontSize: "clamp(2rem, 6vw, 4rem)",
          textAlign: "center",
          fontWeight: 500,
          lineHeight: 1.2,
          whiteSpace: "normal",
        }}
      >
        {text.split("\n").map((line, i) => (
          <div key={i} className="split-line">{line}</div>
        ))}
      </h1>
    </div>
  );
} 