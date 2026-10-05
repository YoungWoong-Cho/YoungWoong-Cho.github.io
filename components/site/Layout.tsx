import Head from "next/head";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { site } from "../../lib/site";

const DEFAULT_IMAGE = "/media/images/hands-viewer.jpg";

export function Layout({
  title,
  description,
  path,
  image,
  type = "website",
  nameAnchorId,
  children,
}: {
  title?: string;
  description?: string;
  /** Site-relative path of this page, e.g. "/" or "/projects/foo". */
  path: string;
  /** Site-relative social-preview image. */
  image?: string;
  type?: "website" | "article";
  /**
   * id of an on-page heading that already shows the name (the home hero).
   * The header name then appears only once that heading has scrolled away.
   */
  nameAnchorId?: string;
  children: ReactNode;
}) {
  const [showName, setShowName] = useState(!nameAnchorId);
  useEffect(() => {
    if (!nameAnchorId) {
      setShowName(true);
      return;
    }
    const el = document.getElementById(nameAnchorId);
    if (!el || !("IntersectionObserver" in window)) {
      setShowName(true);
      return;
    }
    // the sticky header covers the top 58px, so treat that strip as off-screen
    const io = new IntersectionObserver(([e]) => setShowName(!e.isIntersecting), {
      rootMargin: "-58px 0px 0px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [nameAnchorId]);
  const fullTitle = title ? `${title} | ${site.name}` : site.title;
  const desc = description ?? site.description;
  const url = `${site.url}${path}`;
  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={desc} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={url} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={url} />
        <meta property="og:site_name" content={site.name} />
        <meta property="og:image" content={`${site.url}${image ?? DEFAULT_IMAGE}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="theme-color" content="#0b0d10" />
      </Head>
      <header className="site-header">
        <div className="page site-header-inner">
          <Link
            href="/"
            className={`site-name${showName ? " is-visible" : ""}`}
            aria-hidden={!showName}
            tabIndex={showName ? undefined : -1}
          >
            {site.name}
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/#projects">Projects</Link>
            <Link href="/#experience">Experience</Link>
            {site.cv && (
              <a href={site.cv} target="_blank" rel="noopener noreferrer">
                CV
              </a>
            )}
            <Link href="/#contact">Contact</Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="page site-footer-inner">
          <span>© 2026 {site.name}</span>
          <span className="site-footer-links">
            <a href={`mailto:${site.email}`}>Email</a>
            <a href={site.github}>GitHub</a>
            <a href={site.linkedin}>LinkedIn</a>
          </span>
        </div>
      </footer>
    </>
  );
}
