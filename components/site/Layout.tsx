import Head from "next/head";
import Link from "next/link";
import { ReactNode } from "react";
import { site } from "../../lib/site";

const DEFAULT_IMAGE = "/media/images/hands-viewer.jpg";

export function Layout({
  title,
  description,
  path,
  image,
  type = "website",
  children,
}: {
  title?: string;
  description?: string;
  /** Site-relative path of this page, e.g. "/" or "/projects/foo". */
  path: string;
  /** Site-relative social-preview image. */
  image?: string;
  type?: "website" | "article";
  children: ReactNode;
}) {
  const fullTitle = title ? `${title} — ${site.name}` : site.title;
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
          <Link href="/" className="site-name">
            {site.name}
          </Link>
          <nav className="site-nav" aria-label="Main">
            <Link href="/#projects">Projects</Link>
            <Link href="/#experience">Experience</Link>
            {site.cv && <a href={site.cv}>CV</a>}
            <a href={`mailto:${site.email}`}>Contact</a>
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
