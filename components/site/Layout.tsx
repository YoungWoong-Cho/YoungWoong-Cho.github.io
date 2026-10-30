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
  const fullTitle = title ? `${title} | ${site.name}` : site.title;
  const desc = description ?? site.description;
  const url = `${site.url}${path}`;
  const isHome = path === "/";
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
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <div className="container">
        {!isHome && (
          <nav className="topbar" aria-label="Main">
            <Link href="/">← {site.name}</Link>
          </nav>
        )}
        <main>{children}</main>
        <footer className="site-footer">
          <a href="#top">Back to top</a>
          <span>
            Design inspired by <a href="https://jonbarron.info/">Jon Barron</a>&apos;s website.
          </span>
        </footer>
      </div>
    </>
  );
}
