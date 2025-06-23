import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";

interface ProjectSectionProps {
  title: string;
  imageSrc: string;
  href: string;
}

export default function ProjectSection({ title, imageSrc, href }: ProjectSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start end", "end start"] });

  const y = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  return (
    <section
      className="project-section slide"
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div ref={containerRef} style={{ position: "relative" }}>
        <Link href={href} className="project-image-wrapper" style={{ display: "block", width: 300, height: 400, overflow: "hidden", background: "#f5f5f5", position: "relative" }}>
          <img src={imageSrc} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </Link>
        <motion.h2
          style={{
            position: "absolute",
            color: "var(--color-secondary)",
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: 50,
            letterSpacing: -2,
            top: "50%",
            left: "calc(100% + 20px)",
            margin: 0,
            y,
          }}
        >
          {title}
        </motion.h2>
      </div>
    </section>
  );
} 