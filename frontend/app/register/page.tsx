"use client";

import { useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

export default function RegisterPage(): JSX.Element {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [professionalBackground, setProfessionalBackground] = useState("");
  const [uiLanguageCode, setUiLanguageCode] = useState("en");
  const [country, setCountry] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          professional_background: professionalBackground,
          ui_language_code: uiLanguageCode,
          country
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Registration failed.");
      }

      const data = (await response.json()) as { verification_url?: string };
      let link: string | null = null;
      if (data.verification_url) {
        const url = new URL(data.verification_url, API_BASE_URL);
        const token = url.searchParams.get("token");
        link = token ? `/verify?token=${token}` : null;
      }
      setVerificationLink(link);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Registration failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Register</p>
          <h1>Create your account</h1>
          <p className={styles.subhead}>
            Set up a local account to write and publish.
          </p>
        </header>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        {verificationLink ? (
          <div className={styles.success}>
            <p>Check your email to verify your account.</p>
            <p className={styles.devHint}>
              Dev verification link:
              <a href={verificationLink}>{verificationLink}</a>
            </p>
            <p className={styles.devHint}>
              After verification, you can <Link href="/login">log in</Link>.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Full name
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Professional background
            <textarea
              value={professionalBackground}
              onChange={(event) => setProfessionalBackground(event.target.value)}
              rows={3}
              required
            />
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              UI language
              <select
                value={uiLanguageCode}
                onChange={(event) => setUiLanguageCode(event.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="ru">Russian</option>
                <option value="fi">Finnish</option>
                <option value="sv">Swedish</option>
              </select>
            </label>
            <label className={styles.field}>
              Country
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder="US"
                maxLength={2}
                required
              />
            </label>
          </div>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
          </form>
        )}

        <p className={styles.footerCopy}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
