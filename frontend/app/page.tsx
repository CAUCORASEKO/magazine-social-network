import type { CSSProperties } from "react";
import Link from "next/link";

import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const PAGE_SIZE = 12;

const LANGUAGE_OPTIONS = [
  { value: "", label: "All languages" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "ru", label: "Russian" },
  { value: "fi", label: "Finnish" },
  { value: "sv", label: "Swedish" }
];

const TOPIC_OPTIONS = [
  {
    value: process.env.NEXT_PUBLIC_TOPIC_GEOPOLITICS_ID ?? "",
    label: "Geopolitics"
  },
  {
    value: process.env.NEXT_PUBLIC_TOPIC_TECHNOLOGY_ID ?? "",
    label: "Technology"
  },
  {
    value: process.env.NEXT_PUBLIC_TOPIC_SCIENCE_ID ?? "",
    label: "Science"
  },
  {
    value: process.env.NEXT_PUBLIC_TOPIC_ECONOMICS_ID ?? "",
    label: "Economics"
  }
].filter((option) => option.value);

interface ArticleFeedItem {
  id: string;
  title: string;
  published_at: string | null;
  language_id: string;
  topic_id: string;
  magazine_id: string;
}

function getParamValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Unscheduled";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unscheduled";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(date);
}

async function fetchArticles(params: {
  languageCode?: string;
  topicId?: string;
  limit: number;
  offset: number;
}): Promise<ArticleFeedItem[]> {
  const url = new URL("/articles", API_BASE_URL);
  if (params.languageCode) {
    url.searchParams.set("languageCode", params.languageCode);
  }
  if (params.topicId) {
    url.searchParams.set("topicId", params.topicId);
  }
  url.searchParams.set("limit", params.limit.toString());
  url.searchParams.set("offset", params.offset.toString());

  const response = await fetch(url, { next: { revalidate: 10 } });
  if (!response.ok) {
    throw new Error("Failed to load articles");
  }
  return (await response.json()) as ArticleFeedItem[];
}

export default async function Home({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<JSX.Element> {
  const languageCode = getParamValue(searchParams.language) ?? "";
  const topicId = getParamValue(searchParams.topicId) ?? "";
  const offsetParam = getParamValue(searchParams.offset);
  const offset = Math.max(Number.parseInt(offsetParam ?? "0", 10) || 0, 0);

  let articles: ArticleFeedItem[] = [];
  let errorMessage: string | null = null;

  try {
    articles = await fetchArticles({
      languageCode: languageCode || undefined,
      topicId: topicId || undefined,
      limit: PAGE_SIZE,
      offset
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const baseParams = new URLSearchParams();
  if (languageCode) {
    baseParams.set("language", languageCode);
  }
  if (topicId) {
    baseParams.set("topicId", topicId);
  }

  const prevOffset = Math.max(offset - PAGE_SIZE, 0);
  const nextOffset = offset + PAGE_SIZE;

  const prevParams = new URLSearchParams(baseParams);
  prevParams.set("offset", prevOffset.toString());

  const nextParams = new URLSearchParams(baseParams);
  nextParams.set("offset", nextOffset.toString());

  const canGoBack = offset > 0;
  const canGoForward = articles.length === PAGE_SIZE;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Editorial Reader</p>
          <h1 className={styles.title}>Magazine Social Network</h1>
          <p className={styles.subtitle}>
            A calm, text-first reading space for serious long-form writing, with
            strict editorial scope and multilingual discovery.
          </p>
        </div>
        <div className={styles.filterPanel}>
          <p className={styles.filterTitle}>Filter the public feed</p>
          <form className={styles.filterForm} method="get">
            <label className={styles.filterGroup}>
              Language
              <select name="language" defaultValue={languageCode}>
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.filterGroup}>
              Topic
              <select name="topicId" defaultValue={topicId}>
                <option value="">All topics</option>
                {TOPIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.filterActions}>
              <button type="submit" className={styles.filterButton}>
                Apply filters
              </button>
              <Link className={styles.resetLink} href="/">
                Reset
              </Link>
            </div>
          </form>
          {TOPIC_OPTIONS.length === 0 ? (
            <p className={styles.note}>
              Topic filters use seeded topic ids. Add them via
              NEXT_PUBLIC_TOPIC_* env vars.
            </p>
          ) : null}
        </div>
      </header>

      <section className={styles.feed}>
        <div className={styles.feedHeader}>
          <h2 className={styles.feedTitle}>Latest published articles</h2>
          <div className={styles.pagination}>
            <Link
              className={`${styles.pageLink} ${
                canGoBack ? "" : styles.pageLinkDisabled
              }`}
              href={`/?${prevParams.toString()}`}
            >
              Previous
            </Link>
            <Link
              className={`${styles.pageLink} ${
                canGoForward ? "" : styles.pageLinkDisabled
              }`}
              href={`/?${nextParams.toString()}`}
            >
              Next
            </Link>
          </div>
        </div>

        {errorMessage ? (
          <div className={styles.errorState}>{errorMessage}</div>
        ) : null}

        {!errorMessage && articles.length === 0 ? (
          <div className={styles.emptyState}>
            No published articles match these filters yet.
          </div>
        ) : null}

        <ul className={styles.articleList}>
          {articles.map((article, index) => (
            <li
              key={article.id}
              className={styles.articleCard}
              style={{ "--stagger": `${index * 80}ms` } as CSSProperties}
            >
              <div>
                <p className={styles.articleMeta}>
                  <span>{formatDate(article.published_at)}</span>
                  <span>Language: {article.language_id}</span>
                </p>
                <h3 className={styles.articleTitle}>{article.title}</h3>
              </div>
              <p className={styles.articleMeta}>
                <span>Magazine: {article.magazine_id}</span>
              </p>
              <Link className={styles.articleLink} href={`/articles/${article.id}`}>
                Read article
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
