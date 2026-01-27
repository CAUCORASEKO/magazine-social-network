import { pool } from "../db/pool";
import { Article } from "../models/Article";

export interface CreateDraftArticleInput {
  magazine_id: string;
  author_user_id: string;
  language_id: string;
  topic_id: string;
  title: string;
  body: string;
}

export interface UpdateDraftArticleInput {
  article_id: string;
  title: string;
  body: string;
}

export interface ArticleLifecycleRecord {
  id: string;
  magazine_id: string;
  author_user_id: string;
  language_id: string;
  topic_id: string;
  status: "draft" | "submitted" | "published" | "rejected" | "archived";
  created_at: string;
  published_at: string | null;
}

export interface PublishedArticleSummary {
  id: string;
  magazine_id: string;
  author_user_id: string;
  language_id: string;
  topic_id: string;
  status: "published";
  published_at: string;
  title: string;
}

export interface PublishedArticleDetail extends PublishedArticleSummary {
  body: string;
}

export interface PublicArticleFeedItem {
  id: string;
  title: string;
  published_at: string;
  magazine_id: string;
  topic_id: string;
  language_id: string;
}

export async function findDraftByAuthorAndMagazine(
  authorUserId: string,
  magazineId: string
): Promise<ArticleLifecycleRecord | null> {
  const result = await pool.query<ArticleLifecycleRecord>(
    `
    SELECT
      id,
      magazine_id,
      author_user_id,
      language_id,
      topic_id,
      status,
      created_at,
      published_at
    FROM articles
    WHERE author_user_id = $1
      AND magazine_id = $2
      AND status = 'draft'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [authorUserId, magazineId]
  );

  return result.rows[0] ?? null;
}

export async function createDraftArticle(
  input: CreateDraftArticleInput
): Promise<Article> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const articleResult = await client.query(
      `
      INSERT INTO articles (
        magazine_id,
        author_user_id,
        language_id,
        topic_id,
        status
      )
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING
        id,
        magazine_id,
        author_user_id,
        language_id,
        topic_id,
        status,
        created_at,
        published_at
      `,
      [
        input.magazine_id,
        input.author_user_id,
        input.language_id,
        input.topic_id
      ]
    );

    const article = articleResult.rows[0];

    const versionResult = await client.query(
      `
      INSERT INTO article_versions (
        article_id,
        version_number,
        title,
        body
      )
      VALUES ($1, 1, $2, $3)
      RETURNING title, body
      `,
      [article.id, input.title, input.body]
    );

    await client.query("COMMIT");

    return {
      ...article,
      title: versionResult.rows[0].title,
      body: versionResult.rows[0].body
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateDraftArticle(
  input: UpdateDraftArticleInput
): Promise<Article> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const articleResult = await client.query<ArticleLifecycleRecord>(
      `
      SELECT
        id,
        magazine_id,
        author_user_id,
        language_id,
        topic_id,
        status,
        created_at,
        published_at
      FROM articles
      WHERE id = $1
      FOR UPDATE
      `,
      [input.article_id]
    );

    const article = articleResult.rows[0];
    if (!article) {
      throw new Error("Article not found");
    }

    const versionResult = await client.query<{ next_version: number }>(
      `
      SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
      FROM article_versions
      WHERE article_id = $1
      `,
      [input.article_id]
    );

    const nextVersion = versionResult.rows[0]?.next_version ?? 1;

    const versionInsert = await client.query<{ title: string; body: string }>(
      `
      INSERT INTO article_versions (
        article_id,
        version_number,
        title,
        body
      )
      VALUES ($1, $2, $3, $4)
      RETURNING title, body
      `,
      [input.article_id, nextVersion, input.title, input.body]
    );

    await client.query("COMMIT");

    return {
      ...article,
      title: versionInsert.rows[0].title,
      body: versionInsert.rows[0].body
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findArticleById(
  id: string
): Promise<ArticleLifecycleRecord | null> {
  const result = await pool.query<ArticleLifecycleRecord>(
    `
    SELECT
      id,
      magazine_id,
      author_user_id,
      language_id,
      topic_id,
      status,
      created_at,
      published_at
    FROM articles
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function updateArticleStatus(
  id: string,
  status: ArticleLifecycleRecord["status"],
  publishedAt: string | null
): Promise<ArticleLifecycleRecord> {
  const result = await pool.query<ArticleLifecycleRecord>(
    `
    UPDATE articles
    SET status = $2,
        published_at = $3
    WHERE id = $1
    RETURNING
      id,
      magazine_id,
      author_user_id,
      language_id,
      topic_id,
      status,
      created_at,
      published_at
    `,
    [id, status, publishedAt]
  );

  return result.rows[0];
}

export async function submitArticle(
  id: string
): Promise<ArticleLifecycleRecord> {
  return updateArticleStatus(id, "submitted", null);
}

export async function publishArticle(
  id: string,
  publishedAt: string
): Promise<ArticleLifecycleRecord> {
  return updateArticleStatus(id, "published", publishedAt);
}

export async function listPublishedArticlesByMagazine(
  magazineId: string
): Promise<PublishedArticleSummary[]> {
  const result = await pool.query<PublishedArticleSummary>(
    `
    SELECT
      a.id,
      a.magazine_id,
      a.author_user_id,
      a.language_id,
      a.topic_id,
      a.status,
      a.published_at,
      av.title
    FROM articles a
    JOIN article_versions av
      ON av.article_id = a.id
     AND av.version_number = (
       SELECT MAX(version_number)
       FROM article_versions
       WHERE article_id = a.id
     )
    WHERE a.magazine_id = $1
      AND a.status = 'published'
    ORDER BY a.published_at DESC
    `,
    [magazineId]
  );

  return result.rows;
}

export async function listPublishedArticles(): Promise<PublishedArticleSummary[]> {
  const result = await pool.query<PublishedArticleSummary>(
    `
    SELECT
      a.id,
      a.magazine_id,
      a.author_user_id,
      a.language_id,
      a.topic_id,
      a.status,
      a.published_at,
      av.title
    FROM articles a
    JOIN article_versions av
      ON av.article_id = a.id
     AND av.version_number = (
       SELECT MAX(version_number)
       FROM article_versions
       WHERE article_id = a.id
     )
    WHERE a.status = 'published'
    ORDER BY a.published_at DESC
    `
  );

  return result.rows;
}

export async function listPublishedArticlesFeed(params: {
  languageCode?: string;
  topicId?: string;
  limit: number;
  offset: number;
}): Promise<PublicArticleFeedItem[]> {
  const { languageCode, topicId, limit, offset } = params;

  const conditions: string[] = ["a.status = 'published'"];
  const values: unknown[] = [];
  let idx = 1;

  if (languageCode) {
    conditions.push(`l.code = $${idx++}`);
    values.push(languageCode);
  }

  if (topicId) {
    conditions.push(`a.topic_id = $${idx++}`);
    values.push(topicId);
  }

  values.push(limit);
  values.push(offset);

  const query = `
    SELECT
      a.id,
      av.title,
      a.published_at,
      a.magazine_id,
      a.topic_id,
      a.language_id
    FROM articles a
    JOIN article_versions av
      ON av.article_id = a.id
     AND av.version_number = (
       SELECT MAX(version_number)
       FROM article_versions
       WHERE article_id = a.id
     )
    JOIN languages l ON l.id = a.language_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY a.published_at DESC
    LIMIT $${idx++}
    OFFSET $${idx}
  `;

  const result = await pool.query<PublicArticleFeedItem>(query, values);
  return result.rows;
}

export async function getPublishedArticleById(
  articleId: string
): Promise<PublishedArticleDetail | null> {
  const result = await pool.query<PublishedArticleDetail>(
    `
    SELECT
      a.id,
      a.magazine_id,
      a.author_user_id,
      a.language_id,
      a.topic_id,
      a.status,
      a.published_at,
      av.title,
      av.body
    FROM articles a
    JOIN article_versions av
      ON av.article_id = a.id
     AND av.version_number = (
       SELECT MAX(version_number)
       FROM article_versions
       WHERE article_id = a.id
     )
    WHERE a.id = $1
      AND a.status = 'published'
    `,
    [articleId]
  );

  return result.rows[0] ?? null;
}
