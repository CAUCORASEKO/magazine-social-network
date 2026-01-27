import { pool } from "../db/pool";

export interface EducationRecord {
  institution: string;
  degree: string | null;
  field_of_study: string | null;
  start_year: number | null;
  end_year: number | null;
}

export interface ExperienceRecord {
  company: string;
  role: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface ProjectRecord {
  name: string;
  description: string | null;
  link: string | null;
}

export interface LinkRecord {
  label: string | null;
  url: string;
}

export interface SkillRecord {
  name: string;
}

export interface ProfileCvPayload {
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  links: LinkRecord[];
  skills: SkillRecord[];
}

async function safeQuery<T>(
  text: string,
  params: unknown[],
  fallback: T[] = []
): Promise<{ rows: T[] }> {
  try {
    return await pool.query<T>(text, params);
  } catch (error) {
    if (isMissingTableError(error)) {
      return { rows: fallback };
    }
    throw error;
  }
}

async function safeExec(text: string, params: unknown[]): Promise<void> {
  try {
    await pool.query(text, params);
  } catch (error) {
    if (isMissingTableError(error)) {
      return;
    }
    throw error;
  }
}

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function getProfileCvByUserId(
  userId: string
): Promise<ProfileCvPayload> {
  const [education, experience, projects, links, skills] = await Promise.all([
    safeQuery<EducationRecord>(
      `
      SELECT institution, degree, field_of_study, start_year, end_year
      FROM user_profile_education
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    safeQuery<ExperienceRecord>(
      `
      SELECT company, role, description, start_date, end_date
      FROM user_profile_experience
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    safeQuery<ProjectRecord>(
      `
      SELECT name, description, link
      FROM user_profile_projects
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    safeQuery<LinkRecord>(
      `
      SELECT label, url
      FROM user_profile_links
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    safeQuery<SkillRecord>(
      `
      SELECT name
      FROM user_profile_skills
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    )
  ]);

  return {
    education: education.rows,
    experience: experience.rows,
    projects: projects.rows,
    links: links.rows,
    skills: skills.rows
  };
}

export async function upsertProfileCvByUserId(
  userId: string,
  payload: ProfileCvPayload
): Promise<ProfileCvPayload> {
  try {
    await safeExec("DELETE FROM user_profile_education WHERE user_id = $1", [
      userId
    ]);
    await safeExec("DELETE FROM user_profile_experience WHERE user_id = $1", [
      userId
    ]);
    await safeExec("DELETE FROM user_profile_projects WHERE user_id = $1", [
      userId
    ]);
    await safeExec("DELETE FROM user_profile_links WHERE user_id = $1", [
      userId
    ]);
    await safeExec("DELETE FROM user_profile_skills WHERE user_id = $1", [
      userId
    ]);

    for (const item of payload.education) {
      await safeExec(
        `
        INSERT INTO user_profile_education (
          user_id,
          institution,
          degree,
          field_of_study,
          start_year,
          end_year
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          userId,
          item.institution,
          item.degree,
          item.field_of_study,
          item.start_year,
          item.end_year
        ]
      );
    }

    for (const item of payload.experience) {
      await safeExec(
        `
        INSERT INTO user_profile_experience (
          user_id,
          company,
          role,
          description,
          start_date,
          end_date
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          userId,
          item.company,
          item.role,
          item.description,
          item.start_date,
          item.end_date
        ]
      );
    }

    for (const item of payload.projects) {
      await safeExec(
        `
        INSERT INTO user_profile_projects (
          user_id,
          name,
          description,
          link
        )
        VALUES ($1, $2, $3, $4)
        `,
        [userId, item.name, item.description, item.link]
      );
    }

    for (const item of payload.links) {
      await safeExec(
        `
        INSERT INTO user_profile_links (
          user_id,
          label,
          url
        )
        VALUES ($1, $2, $3)
        `,
        [userId, item.label, item.url]
      );
    }

    for (const item of payload.skills) {
      await safeExec(
        `
        INSERT INTO user_profile_skills (
          user_id,
          name
        )
        VALUES ($1, $2)
        `,
        [userId, item.name]
      );
    }

    return payload;
  } catch (error) {
    throw error;
  }
}

export async function hasProfileCvByUserId(userId: string): Promise<boolean> {
  const tables = [
    "user_profile_education",
    "user_profile_experience",
    "user_profile_projects",
    "user_profile_links",
    "user_profile_skills"
  ];

  for (const table of tables) {
    const result = await safeQuery<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM ${table}
        WHERE user_id = $1
        LIMIT 1
      ) AS "exists"
      `,
      [userId],
      [{ exists: false }]
    );

    if (result.rows[0]?.exists) {
      return true;
    }
  }

  return false;
}
