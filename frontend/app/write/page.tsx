"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

type Magazine = {
  id: string;
  title: string;
  description: string | null;
  primary_topic_id: string;
  primary_language_id: string;
  owner_user_id: string;
};

type ArticleLifecycle = {
  id: string;
  status: "draft" | "submitted" | "published" | "rejected" | "archived";
  published_at: string | null;
};

type MeResponse = {
  id: string;
  email_verified: boolean;
  account_status: "pending" | "active";
};

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

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

function MarkdownPreview({ source }: { source: string }): JSX.Element {
  const blocks = useMemo(() => parseMarkdown(source), [source]);

  if (!source.trim()) {
    return (
      <p className={styles.previewPlaceholder}>
        Start writing to see a live preview.
      </p>
    );
  }

  return (
    <div className={styles.previewBody}>
      {blocks.map((block, idx) => {
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
  );
}

function buildHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json"
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data?.error) {
      return data.error;
    }
  } catch {
    // Ignore JSON parse errors.
  }
  return `${response.status} ${response.statusText}`.trim();
}

export default function WritePage(): JSX.Element {
  const router = useRouter();
  const [magazines, setMagazines] = useState<Magazine[]>([]);
  const [selectedMagazineId, setSelectedMagazineId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [articleId, setArticleId] = useState<string | null>(null);
  const [articleStatus, setArticleStatus] = useState<
    ArticleLifecycle["status"] | null
  >(null);
  const [loadingMagazines, setLoadingMagazines] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guardMessage, setGuardMessage] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function guardAccess(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });

        if (response.status === 401) {
          setGuardMessage("Please log in to access the editor.");
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to confirm your session.");
        }

        const me = (await response.json()) as MeResponse;
        if (!me.email_verified) {
          setGuardMessage(
            "Please verify your email before publishing new work."
          );
          return;
        }

        if (me.account_status !== "active") {
          setGuardMessage("Complete your profile to start writing.");
          router.replace("/onboarding");
          return;
        }

        const profileResponse = await fetch(
          `${API_BASE_URL}/profiles/${me.id}`,
          { credentials: "include" }
        );

        if (profileResponse.status === 404) {
          setGuardMessage("Complete your profile to start writing.");
          router.replace("/onboarding");
          return;
        }
      } catch (error) {
        if (isActive) {
          setGuardMessage(
            error instanceof Error ? error.message : "Unable to load the editor."
          );
        }
      } finally {
        if (isActive) {
          setCheckingAuth(false);
        }
      }
    }

    async function loadMagazines(): Promise<void> {
      setLoadingMagazines(true);
      setErrorMessage(null);
      try {
        const response = await fetch(`${API_BASE_URL}/magazines`, {
          headers: buildHeaders(),
          credentials: "include"
        });
        if (!response.ok) {
          const errorText = await parseErrorMessage(response);
          throw new Error(errorText);
        }
        const data = (await response.json()) as Magazine[];
        if (isActive) {
          setMagazines(data);
          if (!selectedMagazineId && data.length > 0) {
            setSelectedMagazineId(data[0].id);
          }
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load magazines"
          );
        }
      } finally {
        if (isActive) {
          setLoadingMagazines(false);
        }
      }
    }

    guardAccess();
    loadMagazines();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSaveDraft(): Promise<void> {
    setMessage(null);
    setErrorMessage(null);

    if (!selectedMagazineId) {
      setErrorMessage("Select a magazine before saving a draft.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Body is required.");
      return;
    }

    setSavingDraft(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/magazines/${selectedMagazineId}/articles`,
        {
          method: "POST",
          headers: buildHeaders(),
          body: JSON.stringify({ title, body }),
          credentials: "include"
        }
      );
      if (!response.ok) {
        const errorText = await parseErrorMessage(response);
        throw new Error(errorText);
      }
      const data = (await response.json()) as ArticleLifecycle;
      setArticleId(data.id);
      setArticleStatus(data.status);
      setMessage("Draft saved. You can submit when ready.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save draft"
      );
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmit(): Promise<void> {
    setMessage(null);
    setErrorMessage(null);

    if (!articleId) {
      setErrorMessage("Save a draft before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/articles/${articleId}/submit`,
        {
          method: "POST",
          headers: buildHeaders(),
          credentials: "include"
        }
      );
      if (!response.ok) {
        const errorText = await parseErrorMessage(response);
        throw new Error(errorText);
      }
      const data = (await response.json()) as ArticleLifecycle;
      setArticleStatus(data.status);
      setMessage("Article submitted. You can publish once approved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to submit article"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublish(): Promise<void> {
    setMessage(null);
    setErrorMessage(null);

    if (!articleId) {
      setErrorMessage("Submit a draft before publishing.");
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/articles/${articleId}/publish`,
        {
          method: "POST",
          headers: buildHeaders(),
          credentials: "include"
        }
      );
      if (!response.ok) {
        const errorText = await parseErrorMessage(response);
        throw new Error(errorText);
      }
      const data = (await response.json()) as ArticleLifecycle;
      setArticleStatus(data.status);
      setMessage("Article published. It is now visible in the reader.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to publish article"
      );
    } finally {
      setPublishing(false);
    }
  }

  const statusLabel = articleStatus
    ? `Status: ${articleStatus}`
    : "Status: draft not created";

  if (checkingAuth) {
    return (
      <main className={styles.page}>
        <div className={styles.notice}>Loading editor...</div>
      </main>
    );
  }

  if (guardMessage) {
    return (
      <main className={styles.page}>
        <div className={styles.notice}>
          <p>{guardMessage}</p>
          {guardMessage.includes("profile") ? (
            <p className={styles.noticeLinks}>
              <Link href="/onboarding">Complete onboarding</Link>
            </p>
          ) : null}
          {!guardMessage.includes("not active") &&
          !guardMessage.includes("profile") ? (
            <p className={styles.noticeLinks}>
              <Link href="/register">Register</Link>
              <Link href="/login">Log in</Link>
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Editor</p>
          <h1 className={styles.title}>Write a long-form article</h1>
          <p className={styles.subtitle}>
            Draft, preview, submit, and publish using the existing editorial
            workflow.
          </p>
        </div>
      </header>

      {errorMessage ? (
        <div className={styles.errorState}>{errorMessage}</div>
      ) : null}
      {message ? <div className={styles.successState}>{message}</div> : null}

      <section className={styles.editorGrid}>
        <div className={styles.editorPanel}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="magazine">
              Magazine
            </label>
            <select
              id="magazine"
              className={styles.select}
              value={selectedMagazineId}
              onChange={(event) => setSelectedMagazineId(event.target.value)}
              disabled={loadingMagazines}
            >
              {magazines.length === 0 ? (
                <option value="">
                  {loadingMagazines
                    ? "Loading magazines..."
                    : "No magazines available"}
                </option>
              ) : (
                magazines.map((magazine) => (
                  <option key={magazine.id} value={magazine.id}>
                    {magazine.title}
                  </option>
                ))
              )}
            </select>
            <p className={styles.helper}>
              Drafts can only be created within magazines you own.
            </p>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className={styles.input}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="A focused, long-form title"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="body">
              Body (Markdown)
            </label>
            <textarea
              id="body"
              className={styles.textarea}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write in Markdown. Use headings, paragraphs, blockquotes, and lists."
              rows={18}
            />
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? "Saving..." : "Save draft"}
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>

          <div className={styles.statusRow}>
            <span>{statusLabel}</span>
            {articleId ? (
              <Link className={styles.previewLink} href={`/articles/${articleId}`}>
                View published article
              </Link>
            ) : null}
          </div>
        </div>

        <aside className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <p className={styles.previewTitle}>Live preview</p>
            <p className={styles.previewHint}>
              Matches the reader layout for published articles.
            </p>
          </div>
          <MarkdownPreview source={body} />
        </aside>
      </section>
    </main>
  );
}
