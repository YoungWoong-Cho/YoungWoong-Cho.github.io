"use client";

import { useEffect, useRef, useState } from "react";

// Dot variants
type DotVariant = "dot" | "line";

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  const [dotVariant, setDotVariant] = useState<DotVariant>("dot");

  useEffect(() => {
    const dot = dotRef.current!;

    const move = (e: MouseEvent) => {
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    const handleHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // If hovering over project image => outline with padding
      if (target.closest(".project-image-wrapper")) {
        dot.style.width = "8px";
        dot.style.height = "8px";
        setDotVariant("dot");
        return;
      }

      // Text-like caret detection
      const textLike = target.closest(
        "a, button, span, p, h1, h2, h3, h4, h5, h6, label, input, textarea"
      ) as HTMLElement | null;
      if (textLike) {
        const fontSize = parseFloat(getComputedStyle(textLike).fontSize);
        dot.style.width = "2px";
        dot.style.height = `${fontSize}px`;
        setDotVariant("line");
        return;
      }

      // default dot
      dot.style.width = "8px";
      dot.style.height = "8px";
      setDotVariant("dot");
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mousemove", handleHover);
    const handleScroll = () => {};

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mousemove", handleHover);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className={`cursor-dot ${dotVariant}`} />
    </>
  );
} 