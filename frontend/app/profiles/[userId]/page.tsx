import Link from "next/link";
import { cookies } from "next/headers";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";
import {
  type IdentityStatus,
  type ProfessionalStatus,
  IDENTITY_STATUS,
  PROFESSIONAL_STATUS
} from "../../lib/verification";
import CvModal from "./cv-modal";
import MessageButton from "./message-button";
import ViewToggle from "./view-toggle";

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
  professional_cv_url: string | null;
}

interface PublicProfileCv {
  education: Array<{
    institution: string;
    degree: string | null;
    start_year: number | null;
    end_year: number | null;
  }>;
  experience: Array<{
    company: string;
    role: string;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    is_current: boolean;
  }>;
  projects: Array<{
    name: string;
    description: string | null;
    url: string | null;
  }>;
  links: Array<{
    label: string | null;
    url: string;
  }>;
  skills: Array<{
    name: string;
  }>;
}

interface PublishedArticleSummary {
  id: string;
  title: string;
  published_at: string;
  author_user_id: string;
}

interface MeResponse {
  id: string;
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

async function fetchPublicCv(userId: string): Promise<PublicProfileCv | null> {
  const response = await fetch(`${API_BASE_URL}/profiles/${userId}/cv`, {
    next: { revalidate: 10 },
    credentials: "include"
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load professional background");
  }

  return (await response.json()) as PublicProfileCv;
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
    throw new Error("Unable to load session");
  }

  return (await response.json()) as MeResponse;
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

function formatRange(start: string | null, end: string | null): string {
  if (start && end) {
    return `${start} - ${end}`;
  }
  if (start) {
    return `${start} - Present`;
  }
  return "";
}

function hasPublicCvData(cv: PublicProfileCv | null): boolean {
  if (!cv) {
    return false;
  }
  return (
    cv.education.length > 0 ||
    cv.experience.length > 0 ||
    cv.projects.length > 0 ||
    cv.links.length > 0 ||
    cv.skills.length > 0
  );
}

function getIdentityBadge(status: IdentityStatus): {
  label: string;
  tooltip: string;
  tone: "verified" | "pending" | "rejected" | "muted";
  icon: "check" | "clock" | "x" | "dot";
} {
  switch (status) {
    case IDENTITY_STATUS.DOCUMENT_UPLOADED:
      return {
        label: "Document received",
        tooltip: "Identity document received. Facial verification is next.",
        tone: "pending",
        icon: "clock"
      };
    case IDENTITY_STATUS.FACE_VERIFICATION:
      return {
        label: "Facial verification required",
        tooltip: "Facial verification is required to complete identity checks.",
        tone: "pending",
        icon: "clock"
      };
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
        label: "Professional profile verified",
        tooltip: "Professional profile verified based on structured career information.",
        tone: "verified",
        icon: "check"
      };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return {
        label: "Structured profile required",
        tooltip: "Professional profile has not been completed yet.",
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
  params,
  searchParams
}: {
  params: { userId: string };
  searchParams?: { view?: string };
}): Promise<JSX.Element> {
  let profile: PublicProfile | null = null;
  let profileCv: PublicProfileCv | null = null;
  let me: MeResponse | null = null;
  let publishedArticles: PublishedArticleSummary[] = [];
  let errorMessage: string | null = null;
  let hasPdfCv = false;
  const isPublicView = searchParams?.view === "public";

  try {
    const [profileResult, articleResult, meResult] = await Promise.all([
      fetchProfile(params.userId),
      fetchPublishedArticles(),
      fetchMe()
    ]);
    profile = profileResult;
    me = meResult;
    publishedArticles = articleResult.filter(
      (article) => article.author_user_id === params.userId
    );
    hasPdfCv = Boolean(
      profile?.professional_cv_url && profile.professional_cv_url.trim() !== ""
    );
    if (profile && !hasPdfCv) {
      profileCv = await fetchPublicCv(params.userId);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const isAuthenticated = Boolean(me?.id);
  const isOwner = Boolean(me?.id && profile?.user_id && me.id === profile.user_id);
  const showOwnerControls = isOwner && !isPublicView;
  const canMessage = isAuthenticated && !isOwner && !isPublicView;

  return (
    <main className={styles.page}>
      <div className={styles.topBar}>
        <Link className={styles.backLink} href="/">
          Back to feed
        </Link>
        {showOwnerControls ? (
          <Link className={styles.settingsLink} href="/profile/settings">
            Settings
          </Link>
        ) : null}
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
                {(hasPdfCv || canMessage || isOwner) ? (
                  <div className={styles.profileActions}>
                    {hasPdfCv ? (
                      <div className={styles.cvHeaderAction}>
                        {resolveProfileImageUrl(profile.professional_cv_url) ? (
                          <CvModal
                            cvUrl={
                              resolveProfileImageUrl(profile.professional_cv_url) ??
                              ""
                            }
                          />
                        ) : null}
                      </div>
                    ) : null}
                    {canMessage ? (
                      <div className={styles.messageAction}>
                        <MessageButton recipientUserId={profile.user_id} />
                      </div>
                    ) : null}
                    {isOwner ? (
                      <ViewToggle
                        isPublicView={isPublicView}
                        profileUserId={profile.user_id}
                      />
                    ) : null}
                  </div>
                ) : null}
                {showOwnerControls ? (
                  <div className={styles.ownerActions}>
                    <Link className={styles.ownerLink} href="/profile/edit">
                      Edit profile
                    </Link>
                    <Link className={styles.ownerLink} href="/profile/edit#professional">
                      Edit professional background
                    </Link>
                    <Link className={styles.ownerMessages} href="/messages">
                      Messages
                    </Link>
                  </div>
                ) : null}
                <div className={styles.badges}>
                  {(() => {
                    const badge = getIdentityBadge(profile.identity_status);
                    const isVerified =
                      profile.identity_status === IDENTITY_STATUS.VERIFIED;
                    const isInteractive = showOwnerControls && !isVerified;
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
                    } ${isInteractive ? styles.badgeLink : styles.badgeStatic}`;
                    if (!isInteractive) {
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
                    const isInteractive = showOwnerControls && !isVerified;
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
                    } ${isInteractive ? styles.badgeLink : styles.badgeStatic}`;
                    if (!isInteractive) {
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
          {!hasPdfCv ? (
            <section className={styles.cvSection}>
              <p className={styles.cvTitle}>Professional background</p>
              {profileCv?.experience.length ? (
                <div className={styles.cvCard}>
                  <div className={styles.cvItemTitle}>Experience</div>
                  <ul className={styles.cvList}>
                    {profileCv.experience.map((item, index) => (
                      <li key={`exp-${index}`}>
                        <div className={styles.cvItemTitle}>
                          {item.role} · {item.company}
                        </div>
                        {formatRange(item.start_date, item.end_date) ? (
                          <div className={styles.cvMeta}>
                            {formatRange(item.start_date, item.end_date)}
                          </div>
                        ) : null}
                        {item.description ? (
                          <div className={styles.cvMeta}>{item.description}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileCv?.education.length ? (
                <div className={styles.cvCard}>
                  <div className={styles.cvItemTitle}>Education</div>
                  <ul className={styles.cvList}>
                    {profileCv.education.map((item, index) => (
                      <li key={`edu-${index}`}>
                        <div className={styles.cvItemTitle}>{item.institution}</div>
                        {item.degree ? (
                          <div className={styles.cvMeta}>{item.degree}</div>
                        ) : null}
                        {item.start_year || item.end_year ? (
                          <div className={styles.cvMeta}>
                            {(item.start_year ?? "") +
                              (item.end_year ? ` - ${item.end_year}` : "")}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileCv?.projects.length ? (
                <div className={styles.cvCard}>
                  <div className={styles.cvItemTitle}>Projects</div>
                  <ul className={styles.cvList}>
                    {profileCv.projects.map((item, index) => (
                      <li key={`proj-${index}`}>
                        <div className={styles.cvItemTitle}>{item.name}</div>
                        {item.description ? (
                          <div className={styles.cvMeta}>{item.description}</div>
                        ) : null}
                        {item.url ? (
                          <a
                            className={styles.cvMeta}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.url}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileCv?.links.length ? (
                <div className={styles.cvCard}>
                  <div className={styles.cvItemTitle}>Links</div>
                  <ul className={styles.cvList}>
                    {profileCv.links.map((item, index) => (
                      <li key={`link-${index}`}>
                        <a
                          className={styles.cvMeta}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.label ?? item.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {profileCv?.skills.length ? (
                <div className={styles.cvCard}>
                  <div className={styles.cvItemTitle}>Skills</div>
                  <ul className={styles.cvPillList}>
                    {profileCv.skills.map((item, index) => (
                      <li key={`skill-${index}`} className={styles.cvPill}>
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
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
