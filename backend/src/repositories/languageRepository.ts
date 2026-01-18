import { pool } from "../db/pool";

export interface LanguageLookup {
  id: string;
}

export async function findLanguageById(
  id: string
): Promise<LanguageLookup | null> {
  const result = await pool.query<LanguageLookup>(
    `
    SELECT id
    FROM languages
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}
