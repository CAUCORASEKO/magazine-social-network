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
  full_name: string;
  email_verified: boolean;
  account_status: "pending" | "active";
};

type PublicProfile = {
  profile_image_url: string | null;
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public";
  professional_status: ProfessionalStatus;
  professional_score: number | null;
  professional_verified_at: string | null;
  professional_cv_url: string | null;
};

type EducationEntry = {
  institution: string;
  degree: string;
  start_year: string;
  end_year: string;
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
    degree: string | null;
    start_year: number | null;
    end_year: number | null;
  }>;
  experience: Array<{
    company: string;
    role: string;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    is_current: boolean;
  }>;
  projects: Array<{
    name: string;
    description: string | null;
    url: string | null;
  }>;
  links: Array<{
    label: string | null;
    url: string;
  }>;
  skills: Array<{
    name: string;
  }>;
};

export default function ProfileEditPage(): JSX.Element {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [externalLinks, setExternalLinks] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [professionalStatus, setProfessionalStatus] =
    useState<ProfessionalStatus>(PROFESSIONAL_STATUS.EMPTY);
  const [professionalVerifiedAt, setProfessionalVerifiedAt] = useState<
    string | null
  >(null);
  const [professionalCvUrl, setProfessionalCvUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingCv, setIsSavingCv] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUploadError, setCvUploadError] = useState<string | null>(null);
  const [cvUploadMessage, setCvUploadMessage] = useState<string | null>(null);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const [cvStatusMessage, setCvStatusMessage] = useState<string | null>(null);

  const [education, setEducation] = useState<EducationEntry[]>([]);
  const [experience, setExperience] = useState<ExperienceEntry[]>([]);
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

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
        if (isActive) {
          setFullName(me.full_name ?? "");
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
            setProfessionalVerifiedAt(profile.professional_verified_at ?? null);
            setProfessionalCvUrl(
              resolveProfileImageUrl(profile.professional_cv_url)
            );
            setProfileImageUrl(resolveProfileImageUrl(profile.profile_image_url));
            setSelectedPhotoFile(null);
            setPhotoPreviewUrl(null);
            setPhotoError(null);
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
                degree: item.degree ?? "",
                start_year: item.start_year ? item.start_year.toString() : "",
                end_year: item.end_year ? item.end_year.toString() : ""
              }))
            );
            setExperience(
              cv.experience.map((item) => ({
                company: item.company,
                role: item.role,
                start_date: item.start_date ?? "",
                end_date: item.end_date ?? "",
                description: item.description ?? "",
                is_current: item.is_current
              }))
            );
            setProjects(
              cv.projects.map((item) => ({
                name: item.name,
                description: item.description ?? "",
                url: item.url ?? ""
              }))
            );
            setLinks(
              cv.links.map((item) => ({
                label: item.label ?? "",
                url: item.url
              }))
            );
            setSkills(cv.skills.map((item) => item.name));
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
    setPhotoError(null);

    setIsSubmitting(true);
    try {
      const links = externalLinks
        .split("\n")
        .map((link) => link.trim())
        .filter(Boolean);

      if (selectedPhotoFile) {
        setIsUploadingPhoto(true);
        try {
          const formData = new FormData();
          formData.append("photo", selectedPhotoFile);
          const photoResponse = await fetch(`${API_BASE_URL}/profile/photo`, {
            method: "POST",
            credentials: "include",
            body: formData
          });
          if (!photoResponse.ok) {
            const data = (await photoResponse.json()) as { error?: string };
            throw new Error(data?.error || "Unable to upload photo.");
          }
          const updated = (await photoResponse.json()) as {
            profile_image_url: string | null;
          };
          setProfileImageUrl(resolveProfileImageUrl(updated.profile_image_url));
          setSelectedPhotoFile(null);
          setPhotoPreviewUrl(null);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to upload photo.";
          setPhotoError(message);
          throw new Error(message);
        } finally {
          setIsUploadingPhoto(false);
        }
      }

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

      const updated = (await response.json()) as PublicProfile;
      setProfileImageUrl(resolveProfileImageUrl(updated.profile_image_url));
      setMessage("Profile updated.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save profile."
      );
    } finally {
      setIsSubmitting(false);
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
        item.end_year.trim()
      )
      .map((item) => ({
        institution: item.institution.trim(),
        degree: item.degree.trim() || null,
        start_year: ensureNumber(item.start_year),
        end_year: ensureNumber(item.end_year)
      }));

    const normalizedEducation = educationPayload.filter(
      (entry) => entry.institution
    );

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

    const normalizedExperience = experiencePayload.filter(
      (entry) => entry.company && entry.role
    );

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

    const normalizedProjects = projectPayload.filter((entry) => entry.name);

    const linkPayload = links
      .filter((item) => item.label.trim() || item.url.trim())
      .map((item) => ({
        label: item.label.trim() || null,
        url: item.url.trim()
      }));

    const normalizedLinks = linkPayload.filter((entry) => entry.url);

    const normalizedSkills = skills
      .map((skill) => skill.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    return {
      education: normalizedEducation,
      experience: normalizedExperience,
      projects: normalizedProjects,
      links: normalizedLinks,
      skills: normalizedSkills
    };
  }

  async function handleSaveCv(): Promise<void> {
    setErrorMessage(null);
    setMessage(null);
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
        setMessage(
          "Your CV is being processed. Please check back shortly."
        );
        return;
      }
      const result = (await response.json()) as {
        professional_status?: ProfessionalStatus | null;
        professional_verified_at?: string | null;
      };
      if (result.professional_status) {
        setProfessionalStatus(result.professional_status);
        setProfessionalVerifiedAt(result.professional_verified_at ?? null);
        setMessage(
          "Professional profile verified based on structured career information."
        );
      } else {
        setMessage("Professional background saved.");
      }
    } catch {
      setMessage("Your CV is being processed. Please check back shortly.");
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

  function updateSkill(index: number, value: string) {
    setSkills((items) => {
      const next = [...items];
      next[index] = value;
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

  function removeSkill(index: number) {
    setSkills((items) => items.filter((_, idx) => idx !== index));
  }

  function formatVerifiedDate(value: string | null): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString().slice(0, 10);
  }

  const professionalDetails = (() => {
    const verifiedOn = formatVerifiedDate(professionalVerifiedAt);
    switch (professionalStatus) {
      case PROFESSIONAL_STATUS.AI_VERIFIED:
        return {
          label: "Professional profile verified",
          tone: "verified" as const,
          helper: verifiedOn
            ? `Professional profile verified based on structured career information. Verified on ${verifiedOn}.`
            : "Professional profile verified based on structured career information."
        };
      case PROFESSIONAL_STATUS.EMPTY:
      default:
        return {
          label: "Structured profile required",
          tone: "muted" as const,
          helper:
            "Upload your CV (PDF) or complete the structured profile to verify your professional background."
        };
    }
  })();

  const showManualCv = !professionalCvUrl;

  function resolveProfileImageUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }
    if (url.startsWith("/")) {
      return `${API_BASE_URL}${url}`;
    }
    return url;
  }

  function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "";
    }
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return `${first}${last}`.toUpperCase();
  }

  function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ): void {
    const file = event.target.files?.[0];
    if (!file) {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Only JPG, PNG, or WebP images are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 2MB.");
      event.target.value = "";
      return;
    }

    setPhotoError(null);
    setSelectedPhotoFile(file);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function handleCvChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      setCvFile(null);
      setCvUploadError(null);
      return;
    }
    if (file.type !== "application/pdf") {
      setCvUploadError("Only PDF files are allowed.");
      event.target.value = "";
      return;
    }
    setCvUploadError(null);
    setCvFile(file);
  }

  function handleRemoveCv(): void {
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/profile/cv`, {
          method: "DELETE",
          credentials: "include"
        });
        if (!response.ok) {
          setCvStatusMessage(
            "Your CV is being processed. Please check back shortly."
          );
          return;
        }
        setProfessionalCvUrl(null);
        setCvStatusMessage(
          "CV removed. Add a new upload or save manual entries."
        );
      } catch {
        setCvStatusMessage(
          "Your CV is being processed. Please check back shortly."
        );
      }
    })();
  }

  async function handleCvUpload(): Promise<void> {
    if (!cvFile) {
      setCvUploadError("Select a PDF to upload.");
      return;
    }
    setErrorMessage(null);
    setCvUploadError(null);
    setCvUploadMessage(null);
    setCvStatusMessage(null);
    setIsUploadingCv(true);

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      const response = await fetch(`${API_BASE_URL}/profile/cv/upload`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        setCvUploadMessage(
          "Your CV upload is being processed. Check back shortly."
        );
        return;
      }

      const result = (await response.json()) as {
        profile?: {
          headline?: string | null;
          bio?: string | null;
          professional_cv_url?: string | null;
        };
        cv?: ProfileCvResponse;
        professional_status?: ProfessionalStatus;
        professional_verified_at?: string | null;
        professional_cv_url?: string | null;
      };

      if (result.profile) {
        setHeadline(result.profile.headline ?? "");
        setBio(result.profile.bio ?? "");
        if (result.profile.professional_cv_url) {
          setProfessionalCvUrl(
            resolveProfileImageUrl(result.profile.professional_cv_url)
          );
        }
      }
      if (result.cv) {
        setEducation(
          result.cv.education.map((item) => ({
            institution: item.institution,
            degree: item.degree ?? "",
            start_year: item.start_year ? item.start_year.toString() : "",
            end_year: item.end_year ? item.end_year.toString() : ""
          }))
        );
        setExperience(
          result.cv.experience.map((item) => ({
            company: item.company,
            role: item.role,
            start_date: item.start_date ?? "",
            end_date: item.end_date ?? "",
            description: item.description ?? "",
            is_current: item.is_current
          }))
        );
        setProjects(
          result.cv.projects.map((item) => ({
            name: item.name,
            description: item.description ?? "",
            url: item.url ?? ""
          }))
        );
        setLinks(
          result.cv.links.map((item) => ({
            label: item.label ?? "",
            url: item.url
          }))
        );
        setSkills(result.cv.skills.map((item) => item.name));
      }

      if (result.professional_status) {
        setProfessionalStatus(result.professional_status);
      }
      if (result.professional_verified_at !== undefined) {
        setProfessionalVerifiedAt(result.professional_verified_at);
      }
      if (result.professional_cv_url) {
        setProfessionalCvUrl(resolveProfileImageUrl(result.professional_cv_url));
      }

      setCvUploadMessage(
        "Professional profile verified based on structured career information."
      );
      setCvFile(null);
    } catch {
      setCvUploadMessage(
        "Your CV upload is being processed. Check back shortly."
      );
    } finally {
      setIsUploadingCv(false);
    }
  }

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div>
              <p className={styles.eyebrow}>Profile</p>
              <h1>Edit your profile</h1>
              <p className={styles.subhead}>
                Keep your public profile concise and professional.
              </p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className={styles.error}>
            {errorMessage.includes("Internal server error")
              ? "Something went wrong."
              : errorMessage}
          </div>
        ) : null}
        {message ? <div className={styles.success}>{message}</div> : null}
        <section className={styles.photoSection}>
          <div className={styles.photoHeader}>
            <div>
              <p className={styles.photoEyebrow}>Profile photo</p>
              <h2>Profile photo</h2>
              <p className={styles.photoSubhead}>
                Upload a photo and save changes to apply it.
              </p>
            </div>
          </div>
          <div className={styles.photoRow}>
            <div className={styles.avatar}>
              {photoPreviewUrl ? (
                <img
                  className={styles.avatarImage}
                  src={photoPreviewUrl}
                  alt="Profile preview"
                />
              ) : profileImageUrl ? (
                <img
                  className={styles.avatarImage}
                  src={profileImageUrl}
                  alt="Profile photo"
                />
              ) : (
                <span className={styles.avatarInitials}>
                  {getInitials(fullName)}
                </span>
              )}
            </div>
            <div className={styles.photoMeta}>
              <label className={`${styles.field} ${styles.photoField}`}>
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isUploadingPhoto || isSubmitting}
                />
              </label>
              <p className={styles.photoHint}>
                Max size 2MB. The upload happens when you save changes.
              </p>
              {photoError ? (
                <p className={styles.photoError}>{photoError}</p>
              ) : null}
            </div>
          </div>
        </section>
        <form className={styles.form} onSubmit={handleSubmit} id="identity">
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
            {isSubmitting || isUploadingPhoto ? "Saving..." : "Save changes"}
          </button>
        </form>

        <section className={styles.cvSection}>
          <header className={styles.cvHeader}>
            <p className={styles.cvEyebrow}>Professional background</p>
            <h2>Structured profile</h2>
            <p className={styles.cvSubhead}>
              Choose one path: upload a PDF CV or enter your structured background
              manually. Either path verifies your professional profile.
            </p>
          </header>

          <div className={styles.cvUpload}>
            <div>
              <p className={styles.cvUploadTitle}>Upload CV (PDF)</p>
              <p className={styles.cvUploadHint}>
                Uploading a PDF stores a downloadable CV. Parsing is best-effort.
              </p>
            </div>
            <div className={styles.cvUploadActions}>
              <label className={styles.cvUploadField}>
                Choose PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleCvChange}
                  disabled={isUploadingCv}
                />
              </label>
              <button
                className={styles.primaryButton}
                type="button"
                onClick={handleCvUpload}
                disabled={!cvFile || isUploadingCv}
              >
                {isUploadingCv ? "Uploading..." : "Upload CV (PDF)"}
              </button>
              {professionalCvUrl ? (
                <>
                  <a
                    className={styles.secondaryButton}
                    href={professionalCvUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View CV
                  </a>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={handleRemoveCv}
                  >
                    Remove CV
                  </button>
                </>
              ) : null}
            </div>
            {cvUploadError ? (
              <p className={styles.error}>{cvUploadError}</p>
            ) : null}
            {cvUploadMessage ? (
              <p className={styles.success}>{cvUploadMessage}</p>
            ) : null}
            {cvStatusMessage ? (
              <p className={styles.success}>{cvStatusMessage}</p>
            ) : null}
          </div>

          {showManualCv ? (
          <>
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
                      end_year: ""
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

          <div className={styles.cvBlock}>
            <div className={styles.cvBlockHeader}>
              <h3>Skills</h3>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={() => setSkills((items) => [...items, ""])}
              >
                Add skill
              </button>
            </div>
            {skills.length === 0 ? (
              <p className={styles.cvEmpty}>No skills added yet.</p>
            ) : null}
            {skills.map((skill, index) => (
              <div key={`skill-${index}`} className={styles.cvItem}>
                <label className={styles.field}>
                  Skill
                  <input
                    value={skill}
                    onChange={(event) => updateSkill(index, event.target.value)}
                  />
                </label>
                <button
                  className={styles.removeButton}
                  type="button"
                  onClick={() => removeSkill(index)}
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
          </>
          ) : (
            <p className={styles.cvEmpty}>
              A CV PDF is on file. Download it above or replace it with a new upload.
            </p>
          )}
        </section>

        <section className={styles.verificationPanel} id="professional">
          <div className={styles.verificationHeader}>
            <div>
              <p className={styles.verificationLabel}>Professional verification</p>
              <p className={styles.verificationStatus}>Current status</p>
            </div>
            <span
              className={`${styles.statusPill} ${
                professionalDetails.tone === "verified"
                  ? styles.badgeVerified
                  : professionalDetails.tone === "pending"
                  ? styles.badgePending
                  : professionalDetails.tone === "rejected"
                  ? styles.badgeRejected
                  : styles.badgeMuted
              }`}
            >
              {professionalDetails.label}
            </span>
          </div>
          <p className={styles.verificationNote}>{professionalDetails.helper}</p>
        </section>
        <div className={styles.footerLink}>
          <Link href="/profile">Back to profile</Link>
        </div>
      </section>
    </main>
  );
}
