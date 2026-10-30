import Link from "next/link";
import { Layout } from "../components/site/Layout";

export default function NotFound() {
  return (
    <Layout title="Not found" path="/404">
      <section className="not-found">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>
          <Link href="/">Back to the home page</Link>
        </p>
      </section>
    </Layout>
  );
}
