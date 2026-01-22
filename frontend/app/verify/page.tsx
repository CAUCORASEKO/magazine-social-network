"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

export default function VerifyPage(): JSX.Element {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your account...");

  useEffect(() => {
    let isActive = true;

    async function verify(): Promise<void> {
      if (!token) {
        if (isActive) {
          setStatus("error");
          setMessage("Verification token is missing.");
        }
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`
        );
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data?.error || "Unable to verify email.");
        }
        if (isActive) {
          setStatus("success");
          setMessage("Email verified. You can now log in.");
        }
      } catch (error) {
        if (isActive) {
          setStatus("error");
          setMessage(
            error instanceof Error ? error.message : "Unable to verify email."
          );
        }
      }
    }

    verify();

    return () => {
      isActive = false;
    };
  }, [token]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1>Verification</h1>
        <p className={styles.copy}>{message}</p>
        {status === "success" ? (
          <Link className={styles.link} href="/login">
            Continue to login
          </Link>
        ) : null}
        {status === "error" ? (
          <Link className={styles.link} href="/register">
            Back to registration
          </Link>
        ) : null}
      </section>
    </main>
  );
}
