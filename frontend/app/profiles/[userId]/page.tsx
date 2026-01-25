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
  profile_image_url: string | null;
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public" | "private";
  identity_status: IdentityStatus;
  identity_verified_at: string | null;
  professional_status: ProfessionalStatus;
  professional_score: number | null;
  professional_verified_at: string | null;
}

interface PublishedArticleSummary {
  id: string;
  title: string;
  published_at: string;
  author_user_id: string;
}

const SHOW_DEBUG_VERIFICATION = false;
const showVerificationDebug =
  process.env.NODE_ENV === "development" || SHOW_DEBUG_VERIFICATION;

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
  icon: "check" | "clock" | "x" | "dot";
} {
  switch (status) {
    case IDENTITY_STATUS.VERIFIED:
      return {
        label: "Identity verified",
        tooltip: "Identity verified.",
        tone: "verified",
        icon: "check"
      };
    case IDENTITY_STATUS.PENDING:
      return {
        label: "Identity verification in progress",
        tooltip: "We’re reviewing identity verification.",
        tone: "pending",
        icon: "clock"
      };
    case IDENTITY_STATUS.REJECTED:
      return {
        label: "Identity verification rejected",
        tooltip: "Identity verification was rejected.",
        tone: "rejected",
        icon: "x"
      };
    case IDENTITY_STATUS.UNVERIFIED:
    default:
      return {
        label: "Identity not verified",
        tooltip: "Identity verification has not been completed.",
        tone: "muted",
        icon: "dot"
      };
  }
}

function getProfessionalBadge(status: ProfessionalStatus): {
  label: string;
  tooltip: string;
  tone: "verified" | "pending" | "rejected" | "muted";
  icon: "check" | "clock" | "x" | "dot";
} {
  switch (status) {
    case PROFESSIONAL_STATUS.AI_VERIFIED:
      return {
        label: "Profession verified",
        tooltip: "Professional verification is complete.",
        tone: "verified",
        icon: "check"
      };
    case PROFESSIONAL_STATUS.PENDING:
      return {
        label: "Verification in progress",
        tooltip: "Professional verification is in progress.",
        tone: "pending",
        icon: "clock"
      };
    case PROFESSIONAL_STATUS.REJECTED:
      return {
        label: "Verification rejected",
        tooltip: "Professional verification was rejected.",
        tone: "rejected",
        icon: "x"
      };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return {
        label: "Profession not verified",
        tooltip: "Professional verification has not been requested.",
        tone: "muted",
        icon: "dot"
      };
  }
}

function BadgeIcon({ name }: { name: "check" | "clock" | "x" | "dot" }): JSX.Element {
  switch (name) {
    case "check":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M6.4 10.8 3.6 8l-1 1 3.8 3.8L13.6 5.6l-1-1z" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 1.2a5.3 5.3 0 1 1 0 10.6A5.3 5.3 0 0 1 8 2.7Zm-.5 2.2v3.6l2.9 1.7.6-1-2.3-1.3V4.9Z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4.2 3 3 4.2 6.8 8 3 11.8 4.2 13l3.8-3.8 3.8 3.8 1.2-1.2L9.2 8 13 4.2 11.8 3 8 6.8Z" />
        </svg>
      );
    case "dot":
    default:
      return (
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <circle cx="8" cy="8" r="3.2" />
        </svg>
      );
  }
}

function getLinkLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("linkedin.com")) {
      return "LinkedIn";
    }
    if (host.includes("github.com")) {
      return "GitHub";
    }
    if (host.includes("x.com") || host.includes("twitter.com")) {
      return "X (Twitter)";
    }
    if (host.includes("medium.com")) {
      return "Medium";
    }
    return "Website";
  } catch {
    return "Website";
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return `${first}${last}`.toUpperCase();
}

function resolveProfileImageUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
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
      <div className={styles.topBar}>
        <Link className={styles.backLink} href="/">
          Back to feed
        </Link>
        <Link className={styles.settingsLink} href="/profile/settings">
          Settings
        </Link>
      </div>

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
            <div className={styles.headerMain}>
              <div className={styles.avatar}>
                {resolveProfileImageUrl(profile.profile_image_url) ? (
                  <img
                    className={styles.avatarImage}
                    src={resolveProfileImageUrl(profile.profile_image_url) ?? ""}
                    alt={`${profile.full_name} profile`}
                  />
                ) : (
                  <span className={styles.avatarInitials}>
                    {getInitials(profile.full_name)}
                  </span>
                )}
              </div>
              <div className={styles.headerText}>
                <h1 className={styles.name}>{profile.full_name}</h1>
                {profile.headline ? (
                  <p className={styles.headline}>{profile.headline}</p>
                ) : null}
                <div className={styles.badges}>
                  {(() => {
                    const badge = getIdentityBadge(profile.identity_status);
                    const isVerified =
                      profile.identity_status === IDENTITY_STATUS.VERIFIED;
                    const className = `${styles.badge} ${
                      isVerified ? styles.badgeSolid : styles.badgeOutline
                    } ${
                      badge.tone === "verified"
                        ? styles.badgeVerified
                        : badge.tone === "pending"
                        ? styles.badgePending
                        : badge.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    } ${isVerified ? styles.badgeStatic : styles.badgeLink}`;
                    if (isVerified) {
                      return (
                        <span className={className} title={badge.tooltip}>
                          <span className={styles.badgeIcon}>
                            <BadgeIcon name={badge.icon} />
                          </span>
                          {badge.label}
                        </span>
                      );
                    }
                    return (
                      <Link
                        className={className}
                        title={badge.tooltip}
                        href="/profile/verify-identity"
                      >
                        <span className={styles.badgeIcon}>
                          <BadgeIcon name={badge.icon} />
                        </span>
                        {badge.label}
                      </Link>
                    );
                  })()}
                  {(() => {
                    const badge = getProfessionalBadge(profile.professional_status);
                    const isVerified =
                      profile.professional_status ===
                      PROFESSIONAL_STATUS.AI_VERIFIED;
                    const className = `${styles.badge} ${
                      isVerified ? styles.badgeSolid : styles.badgeOutline
                    } ${
                      badge.tone === "verified"
                        ? styles.badgeVerified
                        : badge.tone === "pending"
                        ? styles.badgePending
                        : badge.tone === "rejected"
                        ? styles.badgeRejected
                        : styles.badgeMuted
                    } ${isVerified ? styles.badgeStatic : styles.badgeLink}`;
                    if (isVerified) {
                      return (
                        <span className={className} title={badge.tooltip}>
                          <span className={styles.badgeIcon}>
                            <BadgeIcon name={badge.icon} />
                          </span>
                          {badge.label}
                        </span>
                      );
                    }
                    return (
                      <Link
                        className={className}
                        title={badge.tooltip}
                        href="/profile/edit"
                      >
                        <span className={styles.badgeIcon}>
                          <BadgeIcon name={badge.icon} />
                        </span>
                        {badge.label}
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </div>
          </header>
          {showVerificationDebug && profile.professional_score !== null ? (
            <div className={styles.debugBlock}>
              Verification score (debug): {profile.professional_score}
            </div>
          ) : null}
          {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
          {profile.external_links && profile.external_links.length > 0 ? (
            <div className={styles.links}>
              <p className={styles.linksTitle}>External links</p>
              <ul className={styles.linkList}>
                {profile.external_links.map((link, index) => (
                  <li key={`${link}-${index}`}>
                    <span className={styles.linkLabel}>{getLinkLabel(link)}</span>
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
