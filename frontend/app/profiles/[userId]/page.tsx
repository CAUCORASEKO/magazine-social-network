import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";
import {
  type IdentityStatus,
  type ProfessionalStatus,
  IDENTITY_STATUS,
  PROFESSIONAL_STATUS
} from "../../lib/verification";

interface PublicProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public" | "private";
  identity_status: IdentityStatus;
  professional_status: ProfessionalStatus;
}

interface PublishedArticleSummary {
  id: string;
  title: string;
  published_at: string;
  author_user_id: string;
}

async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
    next: { revalidate: 10 },
    credentials: "include"
  });

  if (response.status === 404) {
    return null;
  }

  if (response.status === 403) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data?.error || "Profile is private");
  }

  if (!response.ok) {
    throw new Error("Unable to load profile");
  }

  return (await response.json()) as PublicProfile;
}

async function fetchPublishedArticles(): Promise<PublishedArticleSummary[]> {
  const response = await fetch(`${API_BASE_URL}/articles`, {
    next: { revalidate: 10 },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Unable to load published articles");
  }

  return (await response.json()) as PublishedArticleSummary[];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(date);
}

function getIdentityBadge(status: IdentityStatus): {
  label: string;
  tooltip: string;
  tone: "verified" | "pending" | "rejected" | "muted";
} {
  switch (status) {
    case IDENTITY_STATUS.VERIFIED:
      return {
        label: "Identity verified",
        tooltip:
          "Identity verified. You can publish and appear as a verified author.",
        tone: "verified"
      };
    case IDENTITY_STATUS.PENDING:
      return {
        label: "Identity under review",
        tooltip:
          "Identity verification is in progress. You can edit your profile while we review.",
        tone: "pending"
      };
    case IDENTITY_STATUS.REJECTED:
      return {
        label: "Identity verification failed",
        tooltip:
          "Identity verification failed. Update your profile details and request a new review.",
        tone: "rejected"
      };
    case IDENTITY_STATUS.UNVERIFIED:
    default:
      return {
        label: "Identity not verified",
        tooltip:
          "Identity not verified yet. Complete verification to publish articles.",
        tone: "muted"
      };
  }
}

function getProfessionalBadge(status: ProfessionalStatus): {
  label: string;
  tooltip: string;
  tone: "verified" | "pending" | "rejected" | "muted";
} {
  switch (status) {
    case PROFESSIONAL_STATUS.AI_VERIFIED:
      return {
        label: "Profession verified by AI",
        tooltip:
          "Professional profile verified by AI based on your public profile details.",
        tone: "verified"
      };
    case PROFESSIONAL_STATUS.PENDING:
      return {
        label: "Professional verification in progress",
        tooltip:
          "Professional verification is in progress. Keep your profile accurate and complete.",
        tone: "pending"
      };
    case PROFESSIONAL_STATUS.REJECTED:
      return {
        label: "Professional verification rejected",
        tooltip:
          "Professional verification was rejected. Update your profile and request a new review.",
        tone: "rejected"
      };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return {
        label: "Profession not verified",
        tooltip:
          "Professional verification has not started. Request verification from your profile.",
        tone: "muted"
      };
  }
}

function formatIdentityLabel(status: IdentityStatus): string {
  return getIdentityBadge(status).label;
}

function formatProfessionalLabel(status: ProfessionalStatus): string {
  return getProfessionalBadge(status).label;
}

export default async function ProfilePage({
  params
}: {
  params: { userId: string };
}): Promise<JSX.Element> {
  let profile: PublicProfile | null = null;
  let publishedArticles: PublishedArticleSummary[] = [];
  let errorMessage: string | null = null;

  try {
    const [profileResult, articleResult] = await Promise.all([
      fetchProfile(params.userId),
      fetchPublishedArticles()
    ]);
    profile = profileResult;
    publishedArticles = articleResult.filter(
      (article) => article.author_user_id === params.userId
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/">
        Back to feed
      </Link>

      {errorMessage ? (
        <div className={styles.errorState}>{errorMessage}</div>
      ) : null}

      {!errorMessage && !profile ? (
        <div className={styles.emptyState}>
          No public profile is available yet.
        </div>
      ) : null}

      {profile ? (
        <section className={styles.profile}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Public profile</p>
            <h1 className={styles.name}>{profile.full_name}</h1>
            <div className={styles.badges}>
              {(() => {
                const badge = getIdentityBadge(profile.identity_status);
                return (
                  <span
                    className={`${styles.badge} ${
                      badge.tone === "verified"
                        ? styles.badgeVerified
                        : badge.tone === "pending"
                        ? styles.badgePending
                        : badge.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    }`}
                    title={badge.tooltip}
                  >
                    {badge.label}
                  </span>
                );
              })()}
              {(() => {
                const badge = getProfessionalBadge(profile.professional_status);
                return (
                  <span
                    className={`${styles.badge} ${
                      badge.tone === "verified"
                        ? styles.badgeVerified
                        : badge.tone === "pending"
                        ? styles.badgePending
                        : badge.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    }`}
                    title={badge.tooltip}
                  >
                    {badge.label}
                  </span>
                );
              })()}
            </div>
            {profile.headline ? (
              <p className={styles.headline}>{profile.headline}</p>
            ) : null}
          </header>
          <div className={styles.statusRow}>
            <span>Identity status: {formatIdentityLabel(profile.identity_status)}</span>
            <span>
              Professional status: {formatProfessionalLabel(profile.professional_status)}
            </span>
          </div>
          {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
          {profile.external_links && profile.external_links.length > 0 ? (
            <div className={styles.links}>
              <p className={styles.linksTitle}>External links</p>
              <ul className={styles.linkList}>
                {profile.external_links.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className={styles.articles}>
            <p className={styles.articlesTitle}>Published articles</p>
            {publishedArticles.length === 0 ? (
              <p className={styles.emptyArticles}>No published articles yet.</p>
            ) : (
              <ul className={styles.articleList}>
                {publishedArticles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/articles/${article.id}`}>
                      {article.title}
                    </Link>
                    <span className={styles.articleMeta}>
                      {formatDate(article.published_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
