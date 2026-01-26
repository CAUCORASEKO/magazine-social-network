import { pool } from "../db/pool";

export interface IdentityDocumentRecord {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  uploaded_at: string;
  created_at: string;
}

export async function createIdentityDocument(params: {
  userId: string;
  fileName: string;
  fileType: string;
  filePath: string;
  uploadedAt: string;
}): Promise<IdentityDocumentRecord> {
  const result = await pool.query<IdentityDocumentRecord>(
    `
    INSERT INTO identity_documents (
      user_id,
      file_name,
      file_type,
      file_path,
      uploaded_at
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      user_id,
      file_name,
      file_type,
      file_path,
      uploaded_at,
      created_at
    `,
    [
      params.userId,
      params.fileName,
      params.fileType,
      params.filePath,
      params.uploadedAt
    ]
  );

  return result.rows[0];
}

export async function getLatestIdentityDocumentByUserId(
  userId: string
): Promise<IdentityDocumentRecord | null> {
  const result = await pool.query<IdentityDocumentRecord>(
    `
    SELECT
      id,
      user_id,
      file_name,
      file_type,
      file_path,
      uploaded_at,
      created_at
    FROM identity_documents
    WHERE user_id = $1
    ORDER BY uploaded_at DESC
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function getIdentityDocumentsByUserId(
  userId: string
): Promise<IdentityDocumentRecord[]> {
  const result = await pool.query<IdentityDocumentRecord>(
    `
    SELECT
      id,
      user_id,
      file_name,
      file_type,
      file_path,
      uploaded_at,
      created_at
    FROM identity_documents
    WHERE user_id = $1
    ORDER BY uploaded_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function deleteIdentityDocumentsByUserId(
  userId: string
): Promise<number> {
  const result = await pool.query(
    `
    DELETE FROM identity_documents
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rowCount ?? 0;
}
