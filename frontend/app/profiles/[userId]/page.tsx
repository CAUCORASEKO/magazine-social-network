import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";

interface PublicProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public" | "private";
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
            {profile.headline ? (
              <p className={styles.headline}>{profile.headline}</p>
            ) : null}
          </header>
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
