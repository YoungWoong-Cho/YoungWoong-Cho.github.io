import "../styles/globals.css";
import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({
  subsets: ["latin"],
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
