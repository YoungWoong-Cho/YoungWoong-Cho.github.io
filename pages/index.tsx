import Link from "next/link";
import { Layout } from "../components/site/Layout";
import { MediaView } from "../components/site/Media";
import { projects } from "../lib/projects";
import { education, experience, site } from "../lib/site";

export default function Home() {
  return (
    <Layout path="/">
      <section className="page hero">
        <p className="eyebrow">Robot learning · Dexterous manipulation</p>
        <h1 className="hero-name">{site.name}</h1>
        <p className="hero-lede">
          I work on getting robot policies to transfer across embodiments — from one dexterous hand to
          another, and from human demonstrations to robots.
        </p>
        <p className="hero-sub">
          M.S. Robotics student at Georgia Tech in Prof. Danfei Xu&apos;s{" "}
          <a href="https://rl2.cc.gatech.edu/">Robot Learning and Reasoning Lab</a>. Previously a
          Research Engineer at RLWRLD, adapting robot foundation models to dexterous hands.
        </p>
        <div className="hero-actions">
          <span className="badge">{site.seeking}</span>
          <a className="btn" href={`mailto:${site.email}`}>
            Email
          </a>
          {site.cv && (
            <a className="btn" href={site.cv}>
              CV
            </a>
          )}
          <a className="btn" href={site.github}>
            GitHub
          </a>
          <a className="btn" href={site.linkedin}>
            LinkedIn
          </a>
        </div>
      </section>

      <section className="page feature" aria-labelledby="feature-title">
        <div className="feature-head">
          <p className="eyebrow">Interactive</p>
          <h2 id="feature-title">One action interface, seven hands</h2>
          <p className="prose">
            Every hand gets the same target: a wrist pose and five fingertip positions. Per-hand inverse
            kinematics turns it into joint commands — the interface behind my cross-embodiment study.
            Pick a grasp, drag the slider, or orbit the scene.
          </p>
        </div>
        <div className="panel">
          <MediaView media={{ kind: "hands" }} height={480} />
        </div>
      </section>

      <section id="projects" className="page section" aria-labelledby="projects-title">
        <h2 id="projects-title" className="section-title">
          Projects
        </h2>
        <div className="card-grid">
          {projects.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="card">
              <div className="card-media">
                <MediaView media={p.card ?? p.cover} inLink />
              </div>
              <div className="card-body">
                <p className="card-meta">
                  {p.where} · {p.period}
                </p>
                <h3 className="card-title">{p.title}</h3>
                <p className="card-text">{p.oneLiner}</p>
                <ul className="chips" aria-label="Tags">
                  {p.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="experience" className="page section" aria-labelledby="experience-title">
        <h2 id="experience-title" className="section-title">
          Experience
        </h2>
        <ol className="timeline">
          {experience.map((e) => (
            <li key={e.org} className="timeline-item">
              <div className="timeline-period mono">{e.period}</div>
              <div>
                <h3 className="timeline-org">
                  {e.href ? <a href={e.href}>{e.org}</a> : e.org}
                </h3>
                <p className="timeline-role">
                  {e.role} · {e.place}
                </p>
                {e.note && <p className="timeline-note">{e.note}</p>}
              </div>
            </li>
          ))}
        </ol>

        <h2 className="section-title" style={{ marginTop: 56 }}>
          Education
        </h2>
        <ol className="timeline">
          {education.map((e) => (
            <li key={e.school} className="timeline-item">
              <div className="timeline-period mono">{e.period}</div>
              <div>
                <h3 className="timeline-org">{e.school}</h3>
                <p className="timeline-role">{e.degree}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </Layout>
  );
}
