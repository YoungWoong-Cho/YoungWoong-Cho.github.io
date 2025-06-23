import Head from "next/head";
import ProjectSection from "../components/ProjectSection";
import SplitHeading from "../components/SplitHeading";

export default function Home() {
  return (
    <>
      <Head>
        <title>Youngwoong</title>
        <meta name="description" content="Youngwoong's portfolio" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="snap-container" style={{ background: "#202022", color: "#ededed" }}>
        <section className="slide" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SplitHeading text={`Hi, I'm Youngwoong.
Welcome to my projects.`} />
        </section>

        <ProjectSection
          title="Build a Cat Tower"
          imageSrc="https://images.unsplash.com/flagged/photo-1600322287053-d46e797ce192?q=80&w=986&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          href="/cat-tower"
        />
        <ProjectSection
          title="Design a Candle"
          imageSrc="https://images.unsplash.com/photo-1603905179139-db12ab535ca9?q=80&w=1337&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          href="/design-a-candle"
        />
        <ProjectSection
          title="Home Cafe"
          imageSrc="https://images.unsplash.com/photo-1724768068518-c7f12f81264a?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          href="/home-cafe"
        />
      </main>
    </>
  );
}
