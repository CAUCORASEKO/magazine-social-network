"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";
import {
  IDENTITY_STATUS,
  PROFESSIONAL_STATUS,
  type IdentityStatus,
  type ProfessionalStatus
} from "../../lib/verification";

type MeResponse = {
  id: string;
  full_name: string;
  email: string;
  email_verified: boolean;
  country: string | null;
  account_status: "pending" | "active";
  identity_status: IdentityStatus;
  professional_status?: ProfessionalStatus;
};

type StatusTone = "verified" | "pending" | "rejected" | "muted";

function getIdentityStatus(status: IdentityStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case IDENTITY_STATUS.DOCUMENT_UPLOADED:
      return { label: "Document received", tone: "pending" };
    case IDENTITY_STATUS.FACE_VERIFICATION:
      return { label: "Facial verification required", tone: "pending" };
    case IDENTITY_STATUS.VERIFIED:
      return { label: "Identity verified", tone: "verified" };
    case IDENTITY_STATUS.PENDING:
      return { label: "Verification in progress", tone: "pending" };
    case IDENTITY_STATUS.REJECTED:
      return { label: "Verification rejected", tone: "rejected" };
    case IDENTITY_STATUS.UNVERIFIED:
    default:
      return { label: "Identity not verified", tone: "muted" };
  }
}

function getProfessionalStatus(
  status: ProfessionalStatus | undefined
): { label: string; tone: StatusTone } {
  switch (status) {
    case PROFESSIONAL_STATUS.AI_VERIFIED:
      return { label: "Professional profile verified", tone: "verified" };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return { label: "Structured profile required", tone: "muted" };
  }
}

export default function SettingsPage(): JSX.Element {
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadMe(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load account settings.");
        }
        const data = (await response.json()) as MeResponse;
        if (isActive) {
          setMe(data);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load settings."
          );
        }
      }
    }

    loadMe();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleLogout(): Promise<void> {
    setErrorMessage(null);
    setIsLoggingOut(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Unable to log out right now.");
      }
      router.replace("/");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to log out right now."
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to delete account.");
      }
      setMe(null);
      router.replace("/");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete account."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const identityStatus = me ? getIdentityStatus(me.identity_status) : null;
  const professionalStatus = me
    ? getProfessionalStatus(me.professional_status ?? PROFESSIONAL_STATUS.EMPTY)
    : null;
  const accountStatus = me?.account_status === "active"
    ? { label: "Active", tone: "verified" as const }
    : { label: "Pending", tone: "pending" as const };

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Settings</p>
          <h1>Account settings</h1>
        </div>
        <Link className={styles.backLink} href="/profile">
          Back to profile
        </Link>
      </header>

      {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

      {!me && !errorMessage ? (
        <div className={styles.loading}>Loading settings...</div>
      ) : null}

      {me ? (
        <div className={styles.sections}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Account</h2>
              <p className={styles.sectionHint}>
                This information is tied to your identity and cannot be changed.
              </p>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Full name</span>
                <span className={styles.infoValue}>{me.full_name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email address</span>
                <span className={styles.infoValue}>{me.email}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email verification</span>
                <span className={styles.infoValue}>
                  {me.email_verified ? "Email verified" : "Email not verified"}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Country</span>
                <span className={styles.infoValue}>
                  {me.country ? me.country : "Not set"}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Privacy &amp; publishing</h2>
            </div>
            <div className={styles.itemList}>
              <div className={styles.item}>
                <div>
                  <p className={styles.itemLabel}>Account status</p>
                  <p className={styles.itemCopy}>
                    Publishing is available once your account is active.
                  </p>
                </div>
                <span
                  className={`${styles.statusPill} ${
                    accountStatus.tone === "verified"
                      ? styles.badgeVerified
                      : styles.badgePending
                  }`}
                >
                  {accountStatus.label}
                </span>
              </div>

              {identityStatus ? (
                <div className={styles.item}>
                  <div>
                    <p className={styles.itemLabel}>Identity verification</p>
                    <p className={styles.itemCopy}>
                      Confirm your identity to publish under your name.
                    </p>
                    <Link className={styles.inlineLink} href="/profile/verify-identity">
                      View identity verification
                    </Link>
                  </div>
                  <span
                    className={`${styles.statusPill} ${
                      identityStatus.tone === "verified"
                        ? styles.badgeVerified
                        : identityStatus.tone === "pending"
                        ? styles.badgePending
                        : identityStatus.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    }`}
                  >
                    {identityStatus.label}
                  </span>
                </div>
              ) : null}

              {professionalStatus ? (
                <div className={styles.item}>
                  <div>
                    <p className={styles.itemLabel}>Professional verification</p>
                    <p className={styles.itemCopy}>
                      Upload a CV or complete your structured profile to verify.
                    </p>
                    <Link className={styles.inlineLink} href="/profile/edit">
                      Edit professional profile
                    </Link>
                  </div>
                  <span
                    className={`${styles.statusPill} ${
                      professionalStatus.tone === "verified"
                        ? styles.badgeVerified
                        : professionalStatus.tone === "pending"
                        ? styles.badgePending
                        : professionalStatus.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    }`}
                  >
                    {professionalStatus.label}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Session</h2>
            </div>
            <button
              className={styles.logoutButton}
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </section>

          <section className={`${styles.section} ${styles.dangerZone}`}>
            <div className={styles.sectionHeader}>
              <h2>Danger zone</h2>
              <p className={styles.sectionHint}>
                This permanently deletes your account and all your content.
              </p>
            </div>
            <div className={styles.dangerInputs}>
              <label className={styles.field}>
                Type DELETE to confirm
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder="DELETE"
                />
              </label>
            </div>
            {deleteError ? <div className={styles.error}>{deleteError}</div> : null}
            <button
              className={styles.deleteButton}
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation.trim() !== "DELETE" || isDeleting}
            >
              {isDeleting ? "Deleting account..." : "Delete account"}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
