"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";

type MeResponse = {
  id: string;
  email_verified: boolean;
  account_status: "pending" | "active";
};

type PublicProfile = {
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public";
};

export default function ProfileEditPage(): JSX.Element {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [externalLinks, setExternalLinks] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadProfile(): Promise<void> {
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
        if (!me.email_verified) {
          setErrorMessage("Please verify your email to edit your profile.");
          return;
        }
        if (me.account_status !== "active") {
          router.replace("/onboarding");
          return;
        }

        const profileResponse = await fetch(
          `${API_BASE_URL}/profiles/${me.id}`,
          { credentials: "include" }
        );
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as PublicProfile;
          if (isActive) {
            setHeadline(profile.headline ?? "");
            setBio(profile.bio ?? "");
            setExternalLinks(
              profile.external_links ? profile.external_links.join("\n") : ""
            );
            setVisibility(profile.visibility);
          }
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    setIsSubmitting(true);
    try {
      const links = externalLinks
        .split("\n")
        .map((link) => link.trim())
        .filter(Boolean);

      const response = await fetch(`${API_BASE_URL}/profiles/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          headline,
          bio,
          external_links: links,
          visibility
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to save profile.");
      }

      setMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>Edit your profile</h1>
          <p className={styles.subhead}>
            Keep your public profile concise and professional.
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
            External links (one per line)
            <textarea
              value={externalLinks}
              onChange={(event) => setExternalLinks(event.target.value)}
              rows={3}
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
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </form>

        <div className={styles.footerLink}>
          <Link href="/profile">Back to profile</Link>
        </div>
      </section>
    </main>
  );
}
