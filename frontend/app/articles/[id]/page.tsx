import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";
import {
  type IdentityStatus,
  type ProfessionalStatus,
  IDENTITY_STATUS,
  PROFESSIONAL_STATUS
} from "../../lib/verification";

interface ArticleDetail {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  magazine_id: string;
  author_user_id: string;
}

interface PublicProfileSnippet {
  identity_status: IdentityStatus;
  identity_verified_at: string | null;
  professional_status: ProfessionalStatus;
  professional_score: number | null;
  professional_verified_at: string | null;
}

const SHOW_DEBUG_VERIFICATION = false;
const showVerificationDebug =
  process.env.NODE_ENV === "development" || SHOW_DEBUG_VERIFICATION;

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

function formatDate(value: string | null): string {
  if (!value) {
    return "Unscheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long"
  }).format(date);
}

function formatIsoDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2].trim();
      blocks.push({ type: "heading", level, text });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index].trim();
        if (!/^>\s?/.test(quoteLine)) {
          break;
        }
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ").trim() });
      continue;
    }

    const listMatch = trimmed.match(/^(\d+\.|[-*])\s+(.*)$/);
    if (listMatch) {
      const ordered = /^\d+\./.test(listMatch[1]);
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const itemMatch = itemLine.match(/^(\d+\.|[-*])\s+(.*)$/);
        if (!itemMatch) {
          break;
        }
        items.push(itemMatch[2].trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextLine = lines[index];
      const nextTrim = nextLine.trim();
      if (!nextTrim) {
        index += 1;
        break;
      }
      if (
        /^(#{1,3})\s+/.test(nextTrim) ||
        /^>\s?/.test(nextTrim) ||
        /^(\d+\.|[-*])\s+/.test(nextTrim)
      ) {
        break;
      }
      paragraphLines.push(nextTrim);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): Array<string | JSX.Element> {
  const parts: Array<string | JSX.Element> = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`bold-${match.index}`}>{token.slice(2, -2)}</strong>
      );
    } else {
      parts.push(<em key={`em-${match.index}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function getIdentityBadge(status: IdentityStatus): {
  label: string;
  tooltip: string;
  tone: "verified" | "pending" | "rejected" | "muted";
} {
  switch (status) {
    case IDENTITY_STATUS.DOCUMENT_UPLOADED:
      return {
        label: "Document received",
        tooltip: "Identity document received. Facial verification is next.",
        tone: "pending"
      };
    case IDENTITY_STATUS.FACE_VERIFICATION:
      return {
        label: "Facial verification required",
        tooltip: "Facial verification is required to complete identity checks.",
        tone: "pending"
      };
    case IDENTITY_STATUS.VERIFIED:
      return {
        label: "Identity verified",
        tooltip: "Identity verified.",
        tone: "verified"
      };
    case IDENTITY_STATUS.PENDING:
      return {
        label: "Identity verification in progress",
        tooltip: "We’re reviewing identity verification.",
        tone: "pending"
      };
    case IDENTITY_STATUS.REJECTED:
      return {
        label: "Identity verification failed",
        tooltip: "Identity verification failed.",
        tone: "rejected"
      };
    case IDENTITY_STATUS.UNVERIFIED:
    default:
      return {
        label: "Identity not verified",
        tooltip: "Identity verification has not been completed.",
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
        label: "Profession verified",
        tooltip: "Professional verification is complete.",
        tone: "verified"
      };
    case PROFESSIONAL_STATUS.PENDING:
      return {
        label: "Verification in progress",
        tooltip: "Professional verification is in progress.",
        tone: "pending"
      };
    case PROFESSIONAL_STATUS.REJECTED:
      return {
        label: "Verification rejected",
        tooltip: "Professional verification was rejected.",
        tone: "rejected"
      };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return {
        label: "Profession not verified",
        tooltip: "Professional verification has not been requested.",
        tone: "muted"
      };
  }
}

function getIdentityDetails(
  status: IdentityStatus,
  verifiedAt: string | null
): { label: string; subtext: string } {
  switch (status) {
    case IDENTITY_STATUS.VERIFIED: {
      const verifiedOn = formatIsoDate(verifiedAt);
      return {
        label: "Identity verified",
        subtext: verifiedOn ? `Verified on: ${verifiedOn}` : "Identity verified"
      };
    }
    case IDENTITY_STATUS.PENDING:
      return {
        label: "Identity verification in progress",
        subtext: "We’re reviewing your identity"
      };
    case IDENTITY_STATUS.REJECTED:
      return {
        label: "Identity verification failed",
        subtext: "Please update your information and retry"
      };
    case IDENTITY_STATUS.UNVERIFIED:
    default:
      return {
        label: "Identity not verified",
        subtext: "Verify your identity to unlock publishing"
      };
  }
}

function getProfessionalDetails(
  status: ProfessionalStatus,
  verifiedAt: string | null
): { label: string; subtext: string } {
  switch (status) {
    case PROFESSIONAL_STATUS.AI_VERIFIED: {
      const verifiedOn = formatIsoDate(verifiedAt);
      return {
        label: "Profession verified",
        subtext: verifiedOn ? `Verified on: ${verifiedOn}` : "Profession verified"
      };
    }
    case PROFESSIONAL_STATUS.PENDING:
      return {
        label: "Verification in progress",
        subtext: "AI review in progress"
      };
    case PROFESSIONAL_STATUS.REJECTED:
      return {
        label: "Verification rejected",
        subtext: "Improve your profile and retry"
      };
    case PROFESSIONAL_STATUS.EMPTY:
    default:
      return {
        label: "Profession not verified",
        subtext: "Complete your CV and request verification"
      };
  }
}

async function fetchArticle(articleId: string): Promise<ArticleDetail> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}`, {
    next: { revalidate: 10 },
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Article not found");
  }

  return (await response.json()) as ArticleDetail;
}

async function fetchAuthorProfile(
  userId: string
): Promise<PublicProfileSnippet | null> {
  const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
    next: { revalidate: 10 },
    credentials: "include"
  });

  if (response.status === 404 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load author profile");
  }

  const data = (await response.json()) as PublicProfileSnippet;
  return data;
}

export default async function ArticlePage({
  params
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let article: ArticleDetail | null = null;
  let authorProfile: PublicProfileSnippet | null = null;
  let errorMessage: string | null = null;

  try {
    article = await fetchArticle(params.id);
    try {
      authorProfile = await fetchAuthorProfile(article.author_user_id);
    } catch {
      authorProfile = null;
    }
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

      {article ? (
        <article className={styles.article}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Published article</p>
            <h1 className={styles.title}>{article.title}</h1>
            <div className={styles.meta}>
              <span>{formatDate(article.published_at)}</span>
              <span>
                Author:{" "}
                <Link href={`/profiles/${article.author_user_id}`}>
                  View profile
                </Link>
              </span>
              {authorProfile ? (
                <span className={styles.badgeRow}>
                  {(() => {
                    const badge = getIdentityBadge(authorProfile.identity_status);
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
                    const badge = getProfessionalBadge(
                      authorProfile.professional_status
                    );
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
                </span>
              ) : null}
              {authorProfile ? (
                <div className={styles.verificationDetails}>
                  {(() => {
                    const details = getIdentityDetails(
                      authorProfile.identity_status,
                      authorProfile.identity_verified_at
                    );
                    return (
                      <span className={styles.verificationLine}>
                        {details.label} — {details.subtext}
                      </span>
                    );
                  })()}
                  {(() => {
                    const details = getProfessionalDetails(
                      authorProfile.professional_status,
                      authorProfile.professional_verified_at
                    );
                    return (
                      <span className={styles.verificationLine}>
                        {details.label} — {details.subtext}
                      </span>
                    );
                  })()}
                </div>
              ) : null}
              <span>Magazine: {article.magazine_id}</span>
            </div>
            {authorProfile &&
            showVerificationDebug &&
            authorProfile.professional_score !== null ? (
              <div className={styles.debugBlock}>
                Verification score (debug): {authorProfile.professional_score}
              </div>
            ) : null}
          </header>
          <div className={styles.body}>
            {parseMarkdown(article.body).map((block, idx) => {
              switch (block.type) {
                case "heading": {
                  const Heading =
                    block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
                  return (
                    <Heading key={`heading-${idx}`}>
                      {renderInline(block.text)}
                    </Heading>
                  );
                }
                case "blockquote":
                  return (
                    <blockquote key={`quote-${idx}`}>
                      {renderInline(block.text)}
                    </blockquote>
                  );
                case "list": {
                  const ListTag = block.ordered ? "ol" : "ul";
                  return (
                    <ListTag key={`list-${idx}`}>
                      {block.items.map((item, itemIndex) => (
                        <li key={`item-${idx}-${itemIndex}`}>
                          {renderInline(item)}
                        </li>
                      ))}
                    </ListTag>
                  );
                }
                case "paragraph":
                default:
                  return (
                    <p key={`paragraph-${idx}`}>{renderInline(block.text)}</p>
                  );
              }
            })}
          </div>
        </article>
      ) : null}
    </main>
  );
}
