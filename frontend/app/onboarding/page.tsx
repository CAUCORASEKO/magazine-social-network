"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

type MeResponse = {
  id: string;
  account_status: "pending" | "active";
};

export default function OnboardingPage(): JSX.Element {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function guard(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load your session.");
        }
        const me = (await response.json()) as MeResponse;
        if (me.account_status === "active") {
          router.replace("/");
          return;
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to start onboarding."
          );
        }
      }
    }

    guard();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    setIsSubmitting(true);
    try {
      const trimmedLink = externalLink.trim();
      const payload: {
        headline: string;
        bio: string;
        visibility: "public" | "private";
        external_links?: string[];
      } = { headline, bio, visibility };

      if (trimmedLink) {
        payload.external_links = [trimmedLink];
      }

      const response = await fetch(`${API_BASE_URL}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to save your profile.");
      }

      setMessage("Profile saved. You can start writing now.");
      router.push("/profile");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save your profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Onboarding</p>
          <h1>Complete your profile</h1>
          <p className={styles.subhead}>
            A brief public profile is required before publishing.
          </p>
        </header>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Headline
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Energy policy researcher"
              required
            />
          </label>
          <label className={styles.field}>
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              required
            />
          </label>
          <label className={styles.field}>
            External link (optional)
            <input
              value={externalLink}
              onChange={(event) => setExternalLink(event.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className={styles.field}>
            Visibility
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as "public" | "private")
              }
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Complete profile"}
          </button>
        </form>
      </section>
    </main>
  );
}
