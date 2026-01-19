import Link from "next/link";

import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface ArticleDetail {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  magazine_id: string;
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
    dateStyle: "long"
  }).format(date);
}

async function fetchArticle(articleId: string): Promise<ArticleDetail> {
  const response = await fetch(`${API_BASE_URL}/articles/${articleId}`, {
    next: { revalidate: 10 }
  });

  if (!response.ok) {
    throw new Error("Article not found");
  }

  return (await response.json()) as ArticleDetail;
}

export default async function ArticlePage({
  params
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  let article: ArticleDetail | null = null;
  let errorMessage: string | null = null;

  try {
    article = await fetchArticle(params.id);
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
              <span>Magazine: {article.magazine_id}</span>
            </div>
          </header>
          <div className={styles.body}>
            {article.body.split("\n").map((paragraph, index) => (
              <p key={`${article.id}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>
      ) : null}
    </main>
  );
}
