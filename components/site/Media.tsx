import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Media } from "../../lib/projects";

const HandsInterface = dynamic(() => import("../hands/HandsInterface"), {
  ssr: false,
  loading: () => <div className="media-placeholder">Loading 3D hands…</div>,
});

/** Mounts children only once the placeholder scrolls near the viewport. */
function WhenVisible({ children, minHeight }: { children: React.ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);
  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? children : <div className="media-placeholder" style={{ height: minHeight }} />}
    </div>
  );
}

/**
 * Muted looping clip that plays only while on screen. No `autoPlay` attribute:
 * it would be server-rendered and start every clip (and its download) before
 * hydration. Reduced-motion users get a paused clip with controls instead.
 */
export function Video({
  src,
  poster,
  alt,
  inLink = false,
}: {
  src: string;
  poster?: string;
  alt: string;
  inLink?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    if (reduce) {
      v.pause();
      return;
    }
    // React's `muted` prop is not always reflected before the first play().
    v.muted = true;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      className="media-video"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      // controls inside a link would be invalid and would open the link on click
      controls={reduced && !inLink}
      aria-label={alt}
    />
  );
}

export function MediaView({
  media,
  height = 460,
  inLink = false,
}: {
  media: Media;
  height?: number;
  inLink?: boolean;
}) {
  if (media.kind === "hands")
    return (
      <WhenVisible minHeight={height}>
        <HandsInterface height={height} />
      </WhenVisible>
    );
  if (media.kind === "video")
    return <Video src={media.src} poster={media.poster} alt={media.alt} inLink={inLink} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="media-image" src={media.src} alt={media.alt} loading="lazy" />;
}

/** Social-preview image for a piece of media (absolute path on this site). */
export function previewImage(media: Media): string | undefined {
  if (media.kind === "video") return media.poster;
  if (media.kind === "image") return media.src.endsWith(".svg") ? undefined : media.src;
  return undefined;
}
