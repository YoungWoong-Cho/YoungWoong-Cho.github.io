import "../styles/globals.css";
import type { AppProps } from "next/app";
import { JetBrains_Mono, Lato } from "next/font/google";

// Same pairing as alfred-cueva.github.io: Lato for everything, JetBrains Mono for timeline dates.
const sans = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div id="top" className={`${sans.variable} ${mono.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
