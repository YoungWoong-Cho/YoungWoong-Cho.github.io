import Head from "next/head";
import { ReactNode } from "react";
import { Budget } from "../components/viz/Budget";
import { Pipeline } from "../components/viz/Pipeline";
import { FlowPlayground } from "../components/viz/FlowPlayground";
import { PolicyLoop } from "../components/viz/PolicyLoop";

const SECTIONS = [
  { id: "constraint", n: "01", label: "The constraint" },
  { id: "architecture", n: "02", label: "Architecture" },
  { id: "flow", n: "03", label: "Flow matching" },
  { id: "chunking", n: "04", label: "Chunking" },
  { id: "practice", n: "05", label: "In practice" },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Robot foundation models, interactively</title>
        <meta
          name="description"
          content="An interactive walkthrough of the vision-language-action recipe: flow matching over action chunks, the frozen backbone split, and the real-time budget that constrains all of it."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0d10" />
        <meta property="og:title" content="Robot foundation models, interactively" />
        <meta
          property="og:description"
          content="Flow matching over action chunks, taken apart into four live figures."
        />
        <meta property="og:type" content="article" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Nav />

      <main>
        {/* ------------------------------------------------------------ hero */}
        <header className="page" style={{ padding: "78px 28px 56px" }}>
          <p className="eyebrow">Interactive explainer · vision-language-action</p>
          <h1
            style={{
              fontSize: "clamp(2.1rem, 5.4vw, 3.7rem)",
              margin: "18px 0 22px",
              maxWidth: "17ch",
            }}
          >
            How a robot foundation model turns a sentence into motion
          </h1>
          <p className="prose" style={{ fontSize: 18, color: "var(--fg-muted)" }}>
            The recipe behind <strong>π0</strong>, <strong>GR00T N1.5</strong> and the
            rest of the flow-matching VLA family — pulled apart into the four
            pieces that decide whether the thing actually runs on a robot. Every
            number below is a slider; every figure is live.
          </p>
          <p
            className="mono"
            style={{ marginTop: 26, fontSize: 11.5, color: "var(--fg-dim)" }}
          >
            written for people who already have a robot to put this on
          </p>
        </header>

        {/* ------------------------------------------------------ 01 problem */}
        <Section id="constraint" n="01" title="A slow model on a fast robot">
          <p className="prose">
            A manipulation controller wants a new joint command every 20–30 ms.
            A vision-language model needs considerably longer than that to look
            at an image. Everything distinctive about the VLA recipe follows
            from refusing to accept that as a dealbreaker.
          </p>
          <p className="prose">
            Three concessions make it fit. The policy emits a{" "}
            <strong>chunk</strong> of H future actions instead of one, so a
            single slow forward pass covers many control ticks. The network is{" "}
            <strong>split</strong> into a large vision-language trunk that runs
            once per decision and a small action expert that runs K times on top
            of its cached output. And the chunk is produced by{" "}
            <strong>flow matching</strong>, which generates continuous actions in
            a handful of steps rather than autoregressively decoding them one
            token at a time.
          </p>
          <p className="prose">
            Those three moves interact inside one hard deadline. Drag the
            sliders until it breaks.
          </p>
          <Budget />
        </Section>

        {/* ------------------------------------------------- 02 architecture */}
        <Section id="architecture" n="02" title="Two towers, different clocks">
          <p className="prose">
            The asymmetry is the whole design. The backbone carries the semantic
            work — what a mug is, what &ldquo;on the tray&rdquo; means — and is
            expensive, so it runs <strong>once</strong> and its tokens are
            cached. The action expert carries the motor work and is cheap, so it
            can afford to run <strong>K times</strong> against those cached
            tokens.
          </p>
          <p className="prose">
            Cross-attention is the seam between them: action tokens attend into
            the frozen vision-language features, never the other way around.
            That direction matters. It means gradient pressure from action
            regression never reshapes the representation that grounds language —
            the failure mode where a policy quietly stops reading its
            instruction and just replays the most common motion for that scene.
          </p>
          <Pipeline />
        </Section>

        {/* ---------------------------------------------------- 03 flow math */}
        <Section id="flow" n="03" title="Generating the chunk">
          <p className="prose">
            Take a demonstration chunk <code className="inline">A¹ ∈ ℝ^(H×D)</code>,
            draw noise <code className="inline">A⁰ ~ 𝒩(0, I)</code>, and connect
            them with a straight line. Flow matching trains a network to predict
            the velocity along that line, given how far along it you are.
          </p>

          <div className="math" style={{ margin: "20px 0" }}>
            A^τ = (1 − τ)·A⁰ + τ·A¹ <span className="lbl">— the probability path</span>
            <br />
            u = A¹ − A⁰ <span className="lbl">— constant along it</span>
            <br />
            ℒ(θ) = 𝔼 ‖ v_θ(A^τ, τ, c) − u ‖² <span className="lbl">— c = VL tokens + state</span>
          </div>

          <p className="prose">
            The target is constant, so there is no noise schedule to design and
            no per-step supervision to construct — one τ, one forward pass, one
            MSE. The sampling loop exists only at inference:
          </p>

          <div className="math" style={{ margin: "20px 0" }}>
            A ← A + (1/K)·v_θ(A, τ, c), τ : 0 → 1
          </div>

          <p className="prose">
            Two comparisons are worth holding onto. Against{" "}
            <strong>discrete action tokens</strong> (RT-2, OpenVLA), this keeps
            actions continuous — no binning error, no vocabulary to tune — and
            produces all H×D numbers in K passes instead of decoding them one at
            a time. Against <strong>DDPM-style diffusion policies</strong>, the
            straight-line path is the point: the field is nearly constant, so
            Euler integration converges in single-digit steps where a curved
            diffusion path needs tens.
          </p>
          <p className="prose">
            The curvature slider below is that argument, made adjustable. At
            zero curvature a single step is exact. Turn it up and watch how many
            steps you suddenly need.
          </p>
          <FlowPlayground />
        </Section>

        {/* ------------------------------------------------------ 04 chunking */}
        <Section id="chunking" n="04" title="Committing to the future">
          <p className="prose">
            A chunk is a promise about the next H timesteps made from a single
            observation. Executing all H is maximally efficient and completely
            blind. Executing one and replanning is maximally reactive and
            unaffordable. Everything real sits between: execute{" "}
            <code className="inline">n</code> steps, throw away the rest,
            replan.
          </p>
          <p className="prose">
            The cost of that promise is <strong>staleness</strong> — by the time
            the last executed step of a chunk reaches the motors, the
            observation behind it is <code className="inline">n + latency</code>{" "}
            ticks old. Temporal ensembling softens the seam by averaging
            overlapping chunks instead of hard-switching, which trades a little
            reactivity for a lot of smoothness at the boundaries.
          </p>
          <p className="prose">
            Drag the target around. The red tether shows where the target was
            when the currently-executing chunk was computed.
          </p>
          <PolicyLoop />
        </Section>

        {/* ------------------------------------------------------ 05 practice */}
        <Section id="practice" n="05" title="Where it goes wrong">
          <p className="prose">
            The interesting failures are rarely in the loss curve. In rough
            order of how much time they cost:
          </p>
          <FailureList
            items={[
              [
                "Normalization statistics drift",
                "State and action stats are per-embodiment and computed over the training slice. Deploy with a different set — a rebuilt dataset, a changed joint order — and the policy emits confident, smoothly-denoised garbage. Nothing in the metrics catches it.",
              ],
              [
                "The backbone stops listening",
                "Fine-tune the trunk unfrozen on a narrow task set and language grounding erodes. The policy still succeeds on the training tasks, which is exactly why it takes so long to notice. Test it by giving a wrong instruction for the scene and checking that behaviour actually changes.",
              ],
              [
                "n tuned on the wrong axis",
                "Chunk length gets tuned for smooth-looking rollouts, which pushes n up, which makes the policy deaf to anything that moves. If your scene is static this never surfaces in evaluation and immediately surfaces in deployment.",
              ],
              [
                "Chunk-boundary discontinuities",
                "Hard-switching between chunks puts a step change into the joint targets every n ticks. It shows up as an audible tick in the drivetrain long before it shows up in success rate. Ensembling or blending the overlap fixes it.",
              ],
              [
                "Absolute vs delta action spaces",
                "Mixing embodiments that disagree about whether an action is a target pose or an increment produces a policy that works on one robot and drifts on another. Decide once, per dataset, and check it at ingest.",
              ],
            ]}
          />
        </Section>

        {/* ------------------------------------------------------- citations */}
        <Section id="reading" n="—" title="The papers behind this">
          <p className="prose" style={{ marginBottom: 18 }}>
            This page is a synthesis, not a reproduction of any one system.
            Shapes, parameter counts and latencies are representative defaults
            chosen to make the tradeoffs legible — replace them with your own
            measurements before drawing conclusions.
          </p>
          <ul className="refs">
            {[
              ["Lipman et al.", "Flow Matching for Generative Modeling", "2022"],
              ["Liu et al.", "Flow Straight and Fast: Rectified Flow", "2022"],
              ["Zhao et al.", "Learning Fine-Grained Bimanual Manipulation with Low-Cost Hardware (ACT)", "2023"],
              ["Chi et al.", "Diffusion Policy: Visuomotor Policy Learning via Action Diffusion", "2023"],
              ["Brohan et al.", "RT-2: Vision-Language-Action Models", "2023"],
              ["Kim et al.", "OpenVLA: An Open-Source Vision-Language-Action Model", "2024"],
              ["Black et al.", "π0: A Vision-Language-Action Flow Model for General Robot Control", "2024"],
              ["NVIDIA", "GR00T N1 / N1.5: An Open Foundation Model for Generalist Humanoid Robots", "2025"],
            ].map(([who, what, when]) => (
              <li key={what}>
                <span style={{ color: "var(--fg)" }}>{what}</span>
                <span className="mono" style={{ color: "var(--fg-dim)", fontSize: 11.5 }}>
                  {who} · {when}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <footer
          className="page"
          style={{
            padding: "34px 28px 60px",
            borderTop: "1px solid var(--line)",
            marginTop: 40,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--fg-dim)",
          }}
        >
          <span className="mono">Youngwoong Cho</span>
          <a
            className="mono"
            href="https://github.com/YoungWoong-Cho/YoungWoong-Cho.github.io"
            style={{ borderBottom: "1px solid var(--line-strong)" }}
          >
            source ↗
          </a>
        </footer>
      </main>

      <style jsx global>{`
        .refs {
          list-style: none;
          display: grid;
          gap: 10px;
          max-width: var(--measure);
        }
        .refs li {
          display: grid;
          gap: 1px;
          padding-left: 13px;
          border-left: 1px solid var(--line-strong);
          font-size: 13.5px;
          line-height: 1.45;
        }
      `}</style>
    </>
  );
}

/* ------------------------------------------------------------------- nav */

function Nav() {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--line)",
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div
        className="page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          height: 50,
        }}
      >
        <a href="#top" className="mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
          <span style={{ color: "var(--action)" }}>▚</span> vla.explainer
        </a>
        <div className="navlinks">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="mono">
              <span style={{ color: "var(--fg-dim)" }}>{s.n}</span> {s.label}
            </a>
          ))}
        </div>
      </div>

      <style jsx>{`
        .navlinks {
          display: flex;
          gap: 18px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .navlinks::-webkit-scrollbar {
          display: none;
        }
        .navlinks a {
          font-size: 11.5px;
          color: var(--fg-muted);
          white-space: nowrap;
          padding: 4px 0;
          border-bottom: 1px solid transparent;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .navlinks a:hover {
          color: var(--fg);
          border-bottom-color: var(--action);
        }
        @media (max-width: 720px) {
          .navlinks {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}

/* --------------------------------------------------------------- section */

function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="page" style={{ padding: "44px 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 18,
          paddingBottom: 14,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <span className="mono" style={{ fontSize: 12, color: "var(--action)" }}>
          {n}
        </span>
        <h2 style={{ fontSize: "clamp(1.25rem, 2.6vw, 1.7rem)" }}>{title}</h2>
      </div>
      <div style={{ display: "grid", gap: 14 }}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------- failure list */

function FailureList({ items }: { items: string[][] }) {
  return (
    <ol style={{ listStyle: "none", display: "grid", gap: 2, marginTop: 6 }}>
      {items.map(([title, body], i) => (
        <li
          key={title}
          style={{
            display: "grid",
            gridTemplateColumns: "34px 1fr",
            gap: 12,
            padding: "16px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
          }}
        >
          <span className="mono" style={{ fontSize: 11, color: "var(--fg-dim)", paddingTop: 3 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>{title}</div>
            <p className="prose" style={{ fontSize: 14.5 }}>
              {body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
