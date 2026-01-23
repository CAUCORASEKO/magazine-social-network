"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";
import {
  type ProfessionalStatus,
  PROFESSIONAL_STATUS
} from "../../lib/verification";

type MeResponse = {
  id: string;
  email_verified: boolean;
  account_status: "pending" | "active";
};

type PublicProfile = {
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public";
  professional_status: ProfessionalStatus;
};

type EducationEntry = {
  institution: string;
  degree: string;
  start_year: string;
  end_year: string;
  country: string;
};

type ExperienceEntry = {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
  is_current: boolean;
};

type ProjectEntry = {
  name: string;
  description: string;
  url: string;
};

type LinkEntry = {
  label: string;
  url: string;
};

type ProfileCvResponse = {
  education: Array<{
    institution: string;
    degree: string;
    start_year: number | null;
    end_year: number | null;
    country: string | null;
  }>;
  experience: Array<{
    company: string;
    role: string;
    start_date: string;
    end_date: string | null;
    description: string;
    is_current: boolean;
  }>;
  projects: Array<{
    name: string;
    description: string;
    url: string | null;
  }>;
  links: Array<{
    label: string | null;
    url: string;
  }>;
};

export default function ProfileEditPage(): JSX.Element {
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [externalLinks, setExternalLinks] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [professionalStatus, setProfessionalStatus] =
    useState<ProfessionalStatus>(PROFESSIONAL_STATUS.EMPTY);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSavingCv, setIsSavingCv] = useState(false);

  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [links, setLinks] = useState<LinkEntry[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadProfile(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          throw new Error("Unable to load your session.");
        }
        const me = (await response.json()) as MeResponse;
        if (!me.email_verified) {
          setErrorMessage("Please verify your email to edit your profile.");
          return;
        }
        if (me.account_status !== "active") {
          router.replace("/onboarding");
          return;
        }

        const profileResponse = await fetch(
          `${API_BASE_URL}/profiles/${me.id}`,
          { credentials: "include" }
        );
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as PublicProfile;
          if (isActive) {
            setHeadline(profile.headline ?? "");
            setBio(profile.bio ?? "");
            setExternalLinks(
              profile.external_links ? profile.external_links.join("\n") : ""
            );
            setVisibility(profile.visibility);
            setProfessionalStatus(profile.professional_status);
          }
        }

        const cvResponse = await fetch(`${API_BASE_URL}/profile/cv`, {
          credentials: "include"
        });
        if (cvResponse.ok) {
          const cv = (await cvResponse.json()) as ProfileCvResponse;
          if (isActive) {
            setEducation(
              cv.education.map((item) => ({
                institution: item.institution,
                degree: item.degree,
                start_year: item.start_year ? item.start_year.toString() : "",
                end_year: item.end_year ? item.end_year.toString() : "",
                country: item.country ?? ""
              }))
            );
            setExperience(
              cv.experience.map((item) => ({
                company: item.company,
                role: item.role,
                start_date: item.start_date ?? "",
                end_date: item.end_date ?? "",
                description: item.description,
                is_current: item.is_current
              }))
            );
            setProjects(
              cv.projects.map((item) => ({
                name: item.name,
                description: item.description,
                url: item.url ?? ""
              }))
            );
            setLinks(
              cv.links.map((item) => ({
                label: item.label ?? "",
                url: item.url
              }))
            );
          }
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load profile."
          );
        }
      }
    }

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setVerificationMessage(null);

    setIsSubmitting(true);
    try {
      const links = externalLinks
        .split("\n")
        .map((link) => link.trim())
        .filter(Boolean);

      const response = await fetch(`${API_BASE_URL}/profiles/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          headline,
          bio,
          external_links: links,
          visibility
        })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to save profile.");
      }

      setMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestVerification(): Promise<void> {
    setErrorMessage(null);
    setMessage(null);
    setVerificationMessage(null);
    setIsRequesting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/profile/request-professional-verification`,
        {
          method: "POST",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to request verification.");
      }

      const result = (await response.json()) as {
        professional_status: ProfessionalStatus;
      };
      setProfessionalStatus(result.professional_status);
      setVerificationMessage("Professional verification is now in progress.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to request verification."
      );
    } finally {
      setIsRequesting(false);
    }
  }

  function ensureNumber(value: string): number | null {
    if (!value.trim()) {
      return null;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error("Year must be a number");
    }
    return parsed;
  }

  function validateCv(): ProfileCvResponse {
    const educationPayload = education
      .filter((item) =>
        item.institution.trim() ||
        item.degree.trim() ||
        item.start_year.trim() ||
        item.end_year.trim() ||
        item.country.trim()
      )
      .map((item) => ({
        institution: item.institution.trim(),
        degree: item.degree.trim(),
        start_year: ensureNumber(item.start_year),
        end_year: ensureNumber(item.end_year),
        country: item.country.trim() || null
      }));

    for (const entry of educationPayload) {
      if (!entry.institution || !entry.degree) {
        throw new Error("Education entries require institution and degree.");
      }
    }

    const experiencePayload = experience
      .filter((item) =>
        item.company.trim() ||
        item.role.trim() ||
        item.start_date.trim() ||
        item.end_date.trim() ||
        item.description.trim()
      )
      .map((item) => ({
        company: item.company.trim(),
        role: item.role.trim(),
        start_date: item.start_date.trim(),
        end_date: item.end_date.trim() || null,
        description: item.description.trim(),
        is_current: item.is_current
      }));

    for (const entry of experiencePayload) {
      if (!entry.company || !entry.role || !entry.start_date || !entry.description) {
        throw new Error(
          "Experience entries require company, role, start date, and description."
        );
      }
    }

    const projectPayload = projects
      .filter((item) =>
        item.name.trim() ||
        item.description.trim() ||
        item.url.trim()
      )
      .map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        url: item.url.trim() || null
      }));

    for (const entry of projectPayload) {
      if (!entry.name || !entry.description) {
        throw new Error("Projects require name and description.");
      }
    }

    const linkPayload = links
      .filter((item) => item.label.trim() || item.url.trim())
      .map((item) => ({
        label: item.label.trim() || null,
        url: item.url.trim()
      }));

    for (const entry of linkPayload) {
      if (!entry.url) {
        throw new Error("Links require a URL.");
      }
    }

    return {
      education: educationPayload,
      experience: experiencePayload,
      projects: projectPayload,
      links: linkPayload
    };
  }

  async function handleSaveCv(): Promise<void> {
    setErrorMessage(null);
    setMessage(null);
    setVerificationMessage(null);
    setIsSavingCv(true);

    try {
      const payload = validateCv();
      const response = await fetch(`${API_BASE_URL}/profile/cv`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to save professional background.");
      }

      setMessage("Professional background saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save professional background."
      );
    } finally {
      setIsSavingCv(false);
    }
  }

  function updateEducation(index: number, field: keyof EducationEntry, value: string) {
    setEducation((items) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateExperience(
    index: number,
    field: keyof ExperienceEntry,
    value: string | boolean
  ) {
    setExperience((items) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateProject(index: number, field: keyof ProjectEntry, value: string) {
    setProjects((items) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function updateLink(index: number, field: keyof LinkEntry, value: string) {
    setLinks((items) => {
      const next = [...items];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeEducation(index: number) {
    setEducation((items) => items.filter((_, idx) => idx !== index));
  }

  function removeExperience(index: number) {
    setExperience((items) => items.filter((_, idx) => idx !== index));
  }

  function removeProject(index: number) {
    setProjects((items) => items.filter((_, idx) => idx !== index));
  }

  function removeLink(index: number) {
    setLinks((items) => items.filter((_, idx) => idx !== index));
  }

  const statusLabel = (() => {
    switch (professionalStatus) {
      case PROFESSIONAL_STATUS.PENDING:
        return "Professional verification in progress.";
      case PROFESSIONAL_STATUS.AI_VERIFIED:
        return "Professional verification successful.";
      case PROFESSIONAL_STATUS.REJECTED:
        return "Professional verification rejected.";
      case PROFESSIONAL_STATUS.EMPTY:
      default:
        return "Professional verification not started.";
    }
  })();

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Profile</p>
          <h1>Edit your profile</h1>
          <p className={styles.subhead}>
            Keep your public profile concise and professional.
          </p>
        </header>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}
        {message ? <div className={styles.success}>{message}</div> : null}
        {verificationMessage ? (
          <div className={styles.success}>{verificationMessage}</div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            Headline
            <input
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              required
            />
          </label>
          <label className={styles.field}>
            External links (one per line)
            <textarea
              value={externalLinks}
              onChange={(event) => setExternalLinks(event.target.value)}
              rows={3}
            />
          </label>
          <label className={styles.field}>
            Visibility
            <select
              value={visibility}
              onChange={(event) =>
                setVisibility(event.target.value as "public" | "private")
              }
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </button>
        </form>

        <section className={styles.cvSection}>
          <header className={styles.cvHeader}>
            <p className={styles.cvEyebrow}>Professional background</p>
            <h2>Structured profile</h2>
            <p className={styles.cvSubhead}>
              Add education, experience, projects, and links to support future
              professional verification.
            </p>
          </header>

          <div className={styles.cvBlock}>
            <div className={styles.cvBlockHeader}>
              <h3>Education</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() =>
                  setEducation((items) => [
                    ...items,
                    {
                      institution: "",
                      degree: "",
                      start_year: "",
                      end_year: "",
                      country: ""
                    }
                  ])
                }
              >
                Add education
              </button>
            </div>
            {education.length === 0 ? (
              <p className={styles.cvEmpty}>No education added yet.</p>
            ) : null}
            {education.map((item, index) => (
              <div key={`edu-${index}`} className={styles.cvItem}>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Institution
                    <input
                      value={item.institution}
                      onChange={(event) =>
                        updateEducation(index, "institution", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    Degree
                    <input
                      value={item.degree}
                      onChange={(event) =>
                        updateEducation(index, "degree", event.target.value)
                      }
                    />
                  </label>
                </div>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Start year
                    <input
                      value={item.start_year}
                      onChange={(event) =>
                        updateEducation(index, "start_year", event.target.value)
                      }
                      inputMode="numeric"
                    />
                  </label>
                  <label className={styles.field}>
                    End year
                    <input
                      value={item.end_year}
                      onChange={(event) =>
                        updateEducation(index, "end_year", event.target.value)
                      }
                      inputMode="numeric"
                    />
                  </label>
                  <label className={styles.field}>
                    Country
                    <input
                      value={item.country}
                      onChange={(event) =>
                        updateEducation(index, "country", event.target.value)
                      }
                    />
                  </label>
                </div>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeEducation(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.cvBlock}>
            <div className={styles.cvBlockHeader}>
              <h3>Experience</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() =>
                  setExperience((items) => [
                    ...items,
                    {
                      company: "",
                      role: "",
                      start_date: "",
                      end_date: "",
                      description: "",
                      is_current: false
                    }
                  ])
                }
              >
                Add experience
              </button>
            </div>
            {experience.length === 0 ? (
              <p className={styles.cvEmpty}>No experience added yet.</p>
            ) : null}
            {experience.map((item, index) => (
              <div key={`exp-${index}`} className={styles.cvItem}>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Company
                    <input
                      value={item.company}
                      onChange={(event) =>
                        updateExperience(index, "company", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    Role
                    <input
                      value={item.role}
                      onChange={(event) =>
                        updateExperience(index, "role", event.target.value)
                      }
                    />
                  </label>
                </div>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Start date
                    <input
                      type="date"
                      value={item.start_date}
                      onChange={(event) =>
                        updateExperience(index, "start_date", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    End date
                    <input
                      type="date"
                      value={item.end_date}
                      onChange={(event) =>
                        updateExperience(index, "end_date", event.target.value)
                      }
                      disabled={item.is_current}
                    />
                  </label>
                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={item.is_current}
                      onChange={(event) =>
                        updateExperience(index, "is_current", event.target.checked)
                      }
                    />
                    Current role
                  </label>
                </div>
                <label className={styles.field}>
                  Description
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      updateExperience(index, "description", event.target.value)
                    }
                    rows={3}
                  />
                </label>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeExperience(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.cvBlock}>
            <div className={styles.cvBlockHeader}>
              <h3>Projects</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() =>
                  setProjects((items) => [
                    ...items,
                    { name: "", description: "", url: "" }
                  ])
                }
              >
                Add project
              </button>
            </div>
            {projects.length === 0 ? (
              <p className={styles.cvEmpty}>No projects added yet.</p>
            ) : null}
            {projects.map((item, index) => (
              <div key={`proj-${index}`} className={styles.cvItem}>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Name
                    <input
                      value={item.name}
                      onChange={(event) =>
                        updateProject(index, "name", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    URL
                    <input
                      value={item.url}
                      onChange={(event) =>
                        updateProject(index, "url", event.target.value)
                      }
                    />
                  </label>
                </div>
                <label className={styles.field}>
                  Description
                  <textarea
                    value={item.description}
                    onChange={(event) =>
                      updateProject(index, "description", event.target.value)
                    }
                    rows={3}
                  />
                </label>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeProject(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className={styles.cvBlock}>
            <div className={styles.cvBlockHeader}>
              <h3>Links</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() =>
                  setLinks((items) => [...items, { label: "", url: "" }])
                }
              >
                Add link
              </button>
            </div>
            {links.length === 0 ? (
              <p className={styles.cvEmpty}>No links added yet.</p>
            ) : null}
            {links.map((item, index) => (
              <div key={`link-${index}`} className={styles.cvItem}>
                <div className={styles.cvRow}>
                  <label className={styles.field}>
                    Label
                    <input
                      value={item.label}
                      onChange={(event) =>
                        updateLink(index, "label", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    URL
                    <input
                      value={item.url}
                      onChange={(event) =>
                        updateLink(index, "url", event.target.value)
                      }
                    />
                  </label>
                </div>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeLink(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            className={styles.primaryButton}
            type="button"
            onClick={handleSaveCv}
            disabled={isSavingCv}
          >
            {isSavingCv ? "Saving..." : "Save professional background"}
          </button>
        </section>

        <div className={styles.verificationPanel}>
          <p className={styles.verificationLabel}>Professional verification</p>
          <p className={styles.verificationStatus}>{statusLabel}</p>

          {professionalStatus === PROFESSIONAL_STATUS.EMPTY ? (
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={handleRequestVerification}
              disabled={isRequesting}
              title="Request AI-based verification for your professional profile."
            >
              {isRequesting
                ? "Requesting verification..."
                : "Request professional verification"}
            </button>
          ) : null}

          {professionalStatus === PROFESSIONAL_STATUS.PENDING ? (
            <button
              className={styles.secondaryButton}
              type="button"
              disabled
              title="Verification is in progress."
            >
              Verification in progress
            </button>
          ) : null}

          {professionalStatus === PROFESSIONAL_STATUS.AI_VERIFIED ? (
            <div className={styles.verificationSuccess}>
              Your professional profile is verified by AI.
            </div>
          ) : null}

          {professionalStatus === PROFESSIONAL_STATUS.REJECTED ? (
            <div className={styles.verificationRejected}>
              <p>Your professional verification was rejected.</p>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={handleRequestVerification}
                disabled={isRequesting}
                title="Update your profile and request a new verification."
              >
                {isRequesting
                  ? "Requesting verification..."
                  : "Request professional verification"}
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.footerLink}>
          <Link href="/profile">Back to profile</Link>
        </div>
      </section>
    </main>
  );
}
