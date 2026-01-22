import type { ReactNode } from "react";
import Link from "next/link";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import "./globals.css";
import AuthGate from "./AuthGate";

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata = {
  title: "Magazine Social Network",
  description: "A calm, text-first editorial reader for long-form articles."
};

export default function RootLayout({
  children
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <div className="app-shell">
          <header className="site-header">
            <div className="site-brand">
              <Link href="/">Magazine Social Network</Link>
            </div>
            <nav className="site-nav">
              <Link href="/">Home</Link>
              <Link href="/write">Write</Link>
              <Link href="/profile">Profile</Link>
            </nav>
          </header>
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
