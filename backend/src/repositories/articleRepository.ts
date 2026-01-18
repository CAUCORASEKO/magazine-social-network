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
