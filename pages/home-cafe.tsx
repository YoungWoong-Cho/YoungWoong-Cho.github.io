import Head from "next/head";
import Link from "next/link";

export default function HomeCafe() {
  return (
    <>
      <Head>
        <title>Home Cafe</title>
      </Head>

      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Home Cafe</h1>
        <p>Details coming soon.</p>
        <Link href="/">← Back to home</Link>
      </main>
    </>
  );
} 