import { pool } from "../db/pool";

export interface EducationRecord {
  institution: string;
  degree: string;
  start_year: number | null;
  end_year: number | null;
  country: string | null;
}

export interface ExperienceRecord {
  company: string;
  role: string;
  start_date: string;
  end_date: string | null;
  description: string;
  is_current: boolean;
}

export interface ProjectRecord {
  name: string;
  description: string;
  url: string | null;
}

export interface LinkRecord {
  label: string | null;
  url: string;
}

export interface ProfileCvPayload {
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
  links: LinkRecord[];
}

export async function getProfileCvByUserId(
  userId: string
): Promise<ProfileCvPayload> {
  const [education, experience, projects, links] = await Promise.all([
    pool.query<EducationRecord>(
      `
      SELECT institution, degree, start_year, end_year, country
      FROM user_profile_education
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    pool.query<ExperienceRecord>(
      `
      SELECT company, role, start_date, end_date, description, is_current
      FROM user_profile_experience
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    pool.query<ProjectRecord>(
      `
      SELECT name, description, url
      FROM user_profile_projects
      WHERE user_id = $1
      ORDER BY created_at ASC
      `,
      [userId]
    ),
    pool.query<LinkRecord>(
      `
      SELECT label, url
      FROM user_profile_links
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
    links: links.rows
  };
}

export async function upsertProfileCvByUserId(
  userId: string,
  payload: ProfileCvPayload
): Promise<ProfileCvPayload> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM user_profile_education WHERE user_id = $1", [
      userId
    ]);
    await client.query("DELETE FROM user_profile_experience WHERE user_id = $1", [
      userId
    ]);
    await client.query("DELETE FROM user_profile_projects WHERE user_id = $1", [
      userId
    ]);
    await client.query("DELETE FROM user_profile_links WHERE user_id = $1", [
      userId
    ]);

    for (const item of payload.education) {
      await client.query(
        `
        INSERT INTO user_profile_education (
          user_id,
          institution,
          degree,
          start_year,
          end_year,
          country
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          userId,
          item.institution,
          item.degree,
          item.start_year,
          item.end_year,
          item.country
        ]
      );
    }

    for (const item of payload.experience) {
      await client.query(
        `
        INSERT INTO user_profile_experience (
          user_id,
          company,
          role,
          start_date,
          end_date,
          description,
          is_current
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          userId,
          item.company,
          item.role,
          item.start_date,
          item.end_date,
          item.description,
          item.is_current
        ]
      );
    }

    for (const item of payload.projects) {
      await client.query(
        `
        INSERT INTO user_profile_projects (
          user_id,
          name,
          description,
          url
        )
        VALUES ($1, $2, $3, $4)
        `,
        [userId, item.name, item.description, item.url]
      );
    }

    for (const item of payload.links) {
      await client.query(
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

    await client.query("COMMIT");
    return payload;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
