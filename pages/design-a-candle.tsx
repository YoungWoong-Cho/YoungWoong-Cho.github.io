import Head from "next/head";
import Link from "next/link";

export default function DesignCandle() {
  return (
    <>
      <Head>
        <title>Design a Candle</title>
      </Head>

      <main style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Design a Candle</h1>
        <p>Details coming soon.</p>
        <Link href="/">← Back to home</Link>
      </main>
    </>
  );
} 