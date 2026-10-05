import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";
import { Layout } from "../../components/site/Layout";
import { MediaView, previewImage } from "../../components/site/Media";
import { getProject, projects, type Block, type Project } from "../../lib/projects";

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "h":
      return <h2 className="block-h">{block.text}</h2>;
    case "p":
      return <p className="prose">{block.text}</p>;
    case "list":
      return (
        <ul className="prose block-list">
          {block.items.map((it) => (
            <li key={it}>{it}</li>
          ))}
        </ul>
      );
    case "media":
      return (
        <figure className={`block-media${block.wide ? " wide" : ""}`}>
          <div className="panel">
            <MediaView media={block.media} />
          </div>
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
  }
}

export default function ProjectPage({ slug }: { slug: string }) {
  const p = getProject(slug) as Project;
  const index = projects.findIndex((x) => x.slug === slug);
  const next = projects[(index + 1) % projects.length];
  return (
    <Layout
      title={p.title}
      description={p.oneLiner}
      path={`/projects/${p.slug}`}
      image={p.ogImage ?? previewImage(p.card ?? p.cover)}
      type="article"
    >
      <article className="page project">
        <Link href="/#projects" className="back mono">
          ← All projects
        </Link>
        <p className="eyebrow" style={{ marginTop: 28 }}>
          {p.where} · {p.period}
        </p>
        <h1 className="project-title">{p.title}</h1>
        <p className="project-lede">{p.oneLiner}</p>
        <ul className="chips" aria-label="Tags">
          {p.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>

        <div className="panel project-cover">
          <MediaView media={p.cover} height={520} />
        </div>

        <div className="project-body">
          {p.body.map((b, i) => (
            <BlockView key={i} block={b} />
          ))}
        </div>

        <section className="credits" aria-label="Credits">
          <h2 className="block-h">Credits</h2>
          <ul className="prose block-list">
            {p.credits.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <nav className="next-project" aria-label="Next project">
          <span className="eyebrow">Next</span>
          <Link href={`/projects/${next.slug}`}>{next.title} →</Link>
        </nav>
      </article>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: projects.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => ({
  props: { slug: params?.slug as string },
});
