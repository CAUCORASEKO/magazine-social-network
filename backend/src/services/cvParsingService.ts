import { promises as fs } from "node:fs";
import pdfParse from "pdf-parse";
import type {
  EducationRecord,
  ExperienceRecord,
  SkillRecord
} from "../repositories/profileCvRepository";

export interface ParsedCvData {
  headline: string | null;
  bio: string | null;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillRecord[];
}

const SECTION_HEADERS = {
  summary: [
    "summary",
    "professional summary",
    "profile",
    "objective",
    "about"
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment history",
    "employment"
  ],
  education: ["education", "academics", "academic background"],
  skills: ["skills", "core skills", "technical skills", "expertise"]
};

const DEGREE_KEYWORDS = [
  "bachelor",
  "master",
  "phd",
  "mba",
  "associate",
  "doctor",
  "b.a",
  "b.s",
  "m.s",
  "m.a",
  "bsc",
  "msc"
];

const INSTITUTION_KEYWORDS = [
  "university",
  "college",
  "institute",
  "school",
  "academy"
];

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdfParse(buffer);
  return parsed.text ?? "";
}

export function parseCvText(text: string): ParsedCvData {
  const lines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());

  const nonEmptyLines = lines.filter((line) => line.length > 0);
  const headline = nonEmptyLines[0] ? nonEmptyLines[0] : null;

  const sections = extractSections(lines);
  const bio = extractSummary(sections.summary, nonEmptyLines, headline);

  return {
    headline,
    bio,
    education: parseEducation(sections.education),
    experience: parseExperience(sections.experience),
    skills: parseSkills(sections.skills)
  };
}

function extractSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = {
    summary: [],
    experience: [],
    education: [],
    skills: []
  };

  let current: keyof typeof SECTION_HEADERS | null = null;

  for (const line of lines) {
    if (!line) {
      if (current) {
        sections[current].push("");
      }
      continue;
    }

    const header = detectHeader(line);
    if (header) {
      current = header;
      continue;
    }

    if (current) {
      sections[current].push(line);
    }
  }

  return sections;
}

function detectHeader(line: string): keyof typeof SECTION_HEADERS | null {
  const normalized = line
    .toLowerCase()
    .replace(/[:\-\u2022]/g, "")
    .trim();
  for (const [key, values] of Object.entries(SECTION_HEADERS)) {
    if (
      values.some(
        (value) =>
          normalized === value ||
          normalized.startsWith(`${value} `)
      )
    ) {
      return key as keyof typeof SECTION_HEADERS;
    }
  }
  return null;
}

function extractSummary(
  summaryLines: string[],
  allLines: string[],
  headline: string | null
): string | null {
  const summaryText = summaryLines.filter(Boolean).join(" ").trim();
  if (summaryText) {
    return summaryText;
  }

  const startIndex =
    headline && allLines[0] === headline ? 1 : 0;
  const fallbackLines: string[] = [];
  for (let i = startIndex; i < allLines.length; i += 1) {
    const line = allLines[i];
    if (!line) {
      break;
    }
    if (detectHeader(line)) {
      break;
    }
    fallbackLines.push(line);
    if (fallbackLines.length >= 3) {
      break;
    }
  }

  const fallback = fallbackLines.join(" ").trim();
  return fallback ? fallback : null;
}

function parseSkills(lines: string[]): SkillRecord[] {
  const raw = lines.filter(Boolean).join(" ");
  if (!raw) {
    return [];
  }
  const tokens = raw
    .split(/[,|/\u2022\u00b7]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(tokens));
  return unique.map((name) => ({ name }));
}

function parseEducation(lines: string[]): EducationRecord[] {
  const chunks = splitChunks(lines);
  const records: EducationRecord[] = [];

  for (const chunk of chunks) {
    const joined = chunk.join(" ");
    const years = extractYears(joined);
    const { institution, degree } = parseEducationHeader(chunk);

    if (!institution) {
      continue;
    }

    records.push({
      institution,
      degree: degree ?? null,
      field_of_study: null,
      start_year: years[0] ?? null,
      end_year: years[1] ?? null
    });
  }

  return records;
}

function parseEducationHeader(lines: string[]): {
  institution: string | null;
  degree: string | null;
} {
  if (lines.length >= 2) {
    return {
      institution: lines[0] ?? null,
      degree: lines[1] ?? null
    };
  }

  const line = lines[0];
  if (!line) {
    return { institution: null, degree: null };
  }

  const parts = line
    .split(/[-|\u2022]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1];
    const firstIsDegree = containsKeyword(first, DEGREE_KEYWORDS);
    const secondIsDegree = containsKeyword(second, DEGREE_KEYWORDS);
    if (firstIsDegree && !secondIsDegree) {
      return { institution: second, degree: first };
    }
    if (secondIsDegree && !firstIsDegree) {
      return { institution: first, degree: second };
    }
    const firstIsInstitution = containsKeyword(first, INSTITUTION_KEYWORDS);
    const secondIsInstitution = containsKeyword(second, INSTITUTION_KEYWORDS);
    if (firstIsInstitution && !secondIsInstitution) {
      return { institution: first, degree: second };
    }
    if (secondIsInstitution && !firstIsInstitution) {
      return { institution: second, degree: first };
    }
  }

  return { institution: null, degree: null };
}

function parseExperience(lines: string[]): ExperienceRecord[] {
  const chunks = splitChunks(lines);
  const records: ExperienceRecord[] = [];

  for (const chunk of chunks) {
    const joined = chunk.join(" ");
    const range = parseDateRange(joined);

    const { role, company } = parseRoleCompany(chunk);
    if (!role || !company) {
      continue;
    }

    const descriptionLines = chunk
      .slice(1)
      .filter((line) => Boolean(line))
      .filter((line) => !looksLikeDateLine(line));
    if (descriptionLines[0] === company) {
      descriptionLines.shift();
    }
    const description = descriptionLines.length
      ? descriptionLines.join(" ")
      : `${role} at ${company}.`;

    records.push({
      company,
      role,
      description,
      start_date: range.startDate ?? null,
      end_date: range.endDate
    });
  }

  return records;
}

function parseRoleCompany(lines: string[]): { role: string | null; company: string | null } {
  const first = lines[0];
  if (!first) {
    return { role: null, company: null };
  }

  const atSplit = first.split(/\s+at\s+/i);
  if (atSplit.length === 2) {
    return { role: atSplit[0].trim(), company: atSplit[1].trim() };
  }

  const dashSplit = first.split(/\s[-|\u2022]\s/);
  if (dashSplit.length === 2) {
    return { role: dashSplit[0].trim(), company: dashSplit[1].trim() };
  }

  if (lines.length >= 2) {
    const second = lines[1];
    if (second && !looksLikeDateLine(second)) {
      return { role: first.trim(), company: second.trim() };
    }
    if (lines.length >= 3) {
      return { role: first.trim(), company: lines[2].trim() };
    }
  }

  return { role: first.trim(), company: null };
}

function splitChunks(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (!line) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function extractYears(text: string): number[] {
  const matches = text.match(/\b(19|20)\d{2}\b/g);
  if (!matches) {
    return [];
  }
  const years = matches.map((year) => Number(year)).filter((year) => !Number.isNaN(year));
  return years.slice(0, 2);
}

function parseDateRange(text: string): {
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
} {
  const isCurrent = /present|current|now/i.test(text);
  const monthMatches = Array.from(
    text.matchAll(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/gi
    )
  );

  if (monthMatches.length > 0) {
    const start = monthMatches[0];
    const end = monthMatches.length > 1 ? monthMatches[1] : null;
    const startDate = formatMonthYear(start[1], start[2]);
    const endDate = end ? formatMonthYear(end[1], end[2]) : null;
    return {
      startDate,
      endDate: isCurrent ? null : endDate,
      isCurrent
    };
  }

  const years = extractYears(text);
  if (years.length === 0) {
    return { startDate: null, endDate: null, isCurrent };
  }

  const startDate = formatYear(years[0]);
  const endDate = years.length > 1 ? formatYear(years[1]) : null;
  return {
    startDate,
    endDate: isCurrent ? null : endDate,
    isCurrent
  };
}

function looksLikeDateLine(text: string): boolean {
  return /\b(19|20)\d{2}\b/.test(text) || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text);
}

function formatMonthYear(monthText: string, yearText: string): string {
  const monthKey = monthText.toLowerCase();
  const month = MONTHS[monthKey] ?? 1;
  const year = Number(yearText);
  const paddedMonth = `${month}`.padStart(2, "0");
  return `${year}-${paddedMonth}-01`;
}

function formatYear(year: number): string {
  return `${year}-01-01`;
}

function containsKeyword(value: string, keywords: string[]): boolean {
  const lower = value.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}
