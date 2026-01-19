import Link from "next/link";

import styles from "./page.module.css";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

interface PublicProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
}

async function fetchProfile(userId: string): Promise<PublicProfile | null> {
  const response = await fetch(`${API_BASE_URL}/profiles/${userId}`, {
    next: { revalidate: 10 }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load profile");
  }

  return (await response.json()) as PublicProfile;
}

export default async function ProfilePage({
  params
}: {
  params: { userId: string };
}): Promise<JSX.Element> {
  let profile: PublicProfile | null = null;
  let errorMessage: string | null = null;

  try {
    profile = await fetchProfile(params.userId);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown error";
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} href="/">
        Back to feed
      </Link>

      {errorMessage ? (
        <div className={styles.errorState}>{errorMessage}</div>
      ) : null}

      {!errorMessage && !profile ? (
        <div className={styles.emptyState}>
          This profile is private or does not exist.
        </div>
      ) : null}

      {profile ? (
        <section className={styles.profile}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Public profile</p>
            <h1 className={styles.name}>{profile.full_name}</h1>
            {profile.headline ? (
              <p className={styles.headline}>{profile.headline}</p>
            ) : null}
          </header>
          {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
          {profile.external_links && profile.external_links.length > 0 ? (
            <div className={styles.links}>
              <p className={styles.linksTitle}>External links</p>
              <ul className={styles.linkList}>
                {profile.external_links.map((link) => (
                  <li key={link}>
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
