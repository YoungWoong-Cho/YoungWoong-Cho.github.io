import Head from "next/head";
import Link from "next/link";

export default function CatTower() {
  return (
    <>
      <Head>
        <title>Build a Cat Tower</title>
      </Head>

      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Build a Cat Tower</h1>
        <p>Details coming soon.</p>
        <Link href="/">← Back to home</Link>
      </main>
    </>
  );
} 