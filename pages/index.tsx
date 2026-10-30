import Link from "next/link";
import { Layout } from "../components/site/Layout";
import { MediaView } from "../components/site/Media";
import { projects } from "../lib/projects";
import { earlierProjects, education, experience, site } from "../lib/site";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function Home() {
  const links = [
    { label: "Email", href: `mailto:${site.email}` },
    ...(site.cv ? [{ label: "CV", href: site.cv }] : []),
    { label: "GitHub", href: site.github },
    { label: "LinkedIn", href: site.linkedin },
  ];
  return (
    <Layout path="/">
      <section className="intro">
        <div className="intro-text">
          <h1 className="name">{site.name}</h1>
          <p>
            I&apos;m an M.S. Robotics student at <a href="https://www.gatech.edu/">Georgia Tech</a>,
            advised by Prof. <a href="https://faculty.cc.gatech.edu/~danfei/">Danfei Xu</a> in the{" "}
            <a href="https://rl2.cc.gatech.edu/">Robot Learning and Reasoning Lab (RL2)</a>. I work on
            generalizable robot policies: from one dexterous hand to another, and from human
            demonstrations to robots.
          </p>
          <p>
            Previously, I was a Research Engineer at <a href="https://www.rlwrld.ai/en">RLWRLD</a>,
            adapting robot foundation models to dexterous hands. Before that, I interned at{" "}
            <a href="https://www.naverlabs.com">Naver Labs</a> and{" "}
            <a href="https://seoulrobotics.tech">Seoul Robotics</a>, and received my B.E. in
            Mechanical Engineering from <a href="https://cooper.edu">The Cooper Union</a>.
          </p>
          <p className="link-row">
            {links.map((l, i) => (
              <span key={l.label}>
                {i > 0 && <span className="link-sep">&nbsp;/&nbsp;</span>}
                <a href={l.href} {...(l.href.startsWith("mailto:") ? {} : external)}>
                  {l.label}
                </a>
              </span>
            ))}
          </p>
        </div>
        {site.photo && (
          <div className="intro-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="headshot" src={site.photo} alt={site.name} />
          </div>
        )}
      </section>

      <section id="timeline" className="section" aria-labelledby="timeline-title">
        <h2 id="timeline-title">Timeline</h2>
        <div className="timeline-shell">
          <ol className="timeline">
            {experience.map((e) => (
              <li
                key={e.org}
                className={`timeline-item${e.period.includes("present") ? " is-current" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="timeline-logo" src={e.logo} alt="" loading="lazy" />
                <span className="timeline-date">{e.period}</span>
                <span className="timeline-title">{e.short}</span>
                <span className="timeline-subtitle">{e.role}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="research" className="section" aria-labelledby="research-title">
        <h2 id="research-title">Research</h2>
        <div className="rows">
          {projects.map((p) => (
            <article key={p.slug} className="row">
              <Link href={`/projects/${p.slug}`} className="row-media" tabIndex={-1} aria-hidden>
                <MediaView media={p.card ?? p.cover} inLink />
              </Link>
              <div className="row-body">
                <span className="papertitle">{p.title}</span>
                <br />
                <em>{p.affiliation}</em>
                <br />
                <Link href={`/projects/${p.slug}`}>[Project page]</Link>
                <p className="row-text">{p.oneLiner}</p>
                <p className="tags">
                  <em>{p.tags.join(" · ")}</em>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="projects" className="section" aria-labelledby="projects-title">
        <h2 id="projects-title">Projects</h2>
        <div className="rows">
          {earlierProjects.map((p) => (
            <article key={p.title} className="row row-text-only">
              <div className="row-body">
                <span className="papertitle">{p.title}</span>
                {p.links && (
                  <>
                    <br />
                    {p.links.map((l, i) => (
                      <span key={l.label}>
                        {i > 0 && " | "}
                        <a href={l.href} {...external}>
                          [{l.label}]
                        </a>
                      </span>
                    ))}
                  </>
                )}
                <br />
                <em>{p.context}</em>
                <p className="row-text">{p.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="education" className="section" aria-labelledby="education-title">
        <h2 id="education-title">Education</h2>
        <ul className="edu-list">
          {education.map((e) => (
            <li key={e.school} className="edu-item">
              <div>
                <span className="papertitle">{e.school}</span>
                <br />
                {e.degree}
              </div>
              <em className="edu-period">{e.period}</em>
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
