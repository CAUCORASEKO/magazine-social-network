import type { ReactNode } from "react";
import Link from "next/link";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { cookies } from "next/headers";

import "./globals.css";
import AuthGate from "./AuthGate";
import { API_BASE_URL } from "./lib/api";

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

interface MeResponse {
  id: string;
}

async function fetchMe(): Promise<MeResponse | null> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Cookie: cookieHeader
    },
    cache: "no-store",
    credentials: "include"
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as MeResponse;
}

export default async function RootLayout({
  children
}: {
  children: ReactNode;
}): JSX.Element {
  const me = await fetchMe();
  const isAuthenticated = Boolean(me?.id);

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
              {isAuthenticated ? <Link href="/messages">Messages</Link> : null}
              <Link href="/profile">Profile</Link>
            </nav>
          </header>
          <AuthGate>{children}</AuthGate>
        </div>
      </body>
    </html>
  );
}
