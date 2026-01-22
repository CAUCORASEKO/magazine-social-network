"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

type MeResponse = {
  id: string;
  account_status: "pending" | "active";
};

export default function ProfileRedirectPage(): JSX.Element {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadProfile(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error("Please log in to view your profile.");
        }
        const data = (await response.json()) as MeResponse;
        if (data.account_status !== "active") {
          router.replace("/onboarding");
          return;
        }
        if (isActive) {
          router.replace(`/profiles/${data.id}`);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load profile."
          );
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Profile</h1>
        <p className={styles.copy}>
          {errorMessage
            ? errorMessage
            : "Loading your profile..."}
        </p>
        {errorMessage ? (
          <div className={styles.links}>
            <Link href="/login">Log in</Link>
            <Link href="/register">Register</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
