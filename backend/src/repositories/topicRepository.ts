import { pool } from "../db/pool";

export interface TopicLookup {
  id: string;
}

export async function findTopicById(id: string): Promise<TopicLookup | null> {
  const result = await pool.query<TopicLookup>(
    `
    SELECT id
    FROM topics
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}
