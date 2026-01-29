import Link from "next/link";
import { cookies } from "next/headers";

import styles from "./page.module.css";
import { API_BASE_URL } from "../lib/api";

interface InboxConversation {
  conversation_id: string;
  created_at: string;
  peer_user: {
    id: string;
    full_name: string;
    profile_image_url: string | null;
  };
  last_message: {
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
}

interface MeResponse {
  id: string;
}

async function fetchInbox(): Promise<InboxConversation[]> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${API_BASE_URL}/messages/inbox`, {
    headers: {
      Cookie: cookieHeader
    },
    credentials: "include",
    cache: "no-store"
  });

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error("Unable to load inbox");
  }

  return (await response.json()) as InboxConversation[];
}

async function fetchMe(): Promise<MeResponse | null> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString();
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Cookie: cookieHeader
    },
    cache: "no-store",
    credentials: "include"
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load session");
  }

  return (await response.json()) as MeResponse;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
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

function resolveAvatarUrl(url: string | null): string | null {
  if (!url) {
    return null;
  }
  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

export default async function InboxPage(): Promise<JSX.Element> {
  let inbox: InboxConversation[] = [];
  let errorMessage: string | null = null;
  let me: MeResponse | null = null;

  try {
    inbox = await fetchInbox();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load inbox";
  }

  try {
    me = await fetchMe();
  } catch {
    me = null;
  }

  const meId = me?.id ?? null;

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <Link className={styles.backLink} href="/">
              Back to feed
            </Link>
            <h1 className={styles.title}>Messages</h1>
          </div>

          {errorMessage === "Unauthorized" ? (
            <p className={styles.sidebarEmpty}>Sign in to view your inbox.</p>
          ) : null}

          {errorMessage && errorMessage !== "Unauthorized" ? (
            <p className={styles.sidebarEmpty}>{errorMessage}</p>
          ) : null}

          {!errorMessage && inbox.length === 0 ? (
            <p className={styles.sidebarEmpty}>No conversations yet</p>
          ) : null}

          {!errorMessage && inbox.length > 0 ? (
            <ul className={styles.list}>
              {inbox.map((item) => (
                <li key={item.conversation_id} className={styles.item}>
                  <Link
                    className={styles.itemLink}
                    href={`/messages/${item.conversation_id}`}
                  >
                    <div className={styles.avatar}>
                      {resolveAvatarUrl(item.peer_user.profile_image_url) ? (
                        <img
                          src={resolveAvatarUrl(item.peer_user.profile_image_url) ?? ""}
                          alt={`${item.peer_user.full_name} avatar`}
                        />
                      ) : (
                        <span>{getInitials(item.peer_user.full_name)}</span>
                      )}
                    </div>
                    <div className={styles.content}>
                      <div className={styles.row}>
                        <span className={styles.name}>{item.peer_user.full_name}</span>
                        <span className={styles.time}>
                          {formatDate(item.last_message?.created_at ?? item.created_at)}
                        </span>
                      </div>
                      <p className={styles.preview}>
                        {item.last_message
                          ? item.last_message.sender_id === meId
                            ? `You: ${item.last_message.body}`
                            : item.last_message.body
                          : "No messages yet"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <section className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailTitle}>Conversation</h2>
            <p className={styles.detailSubtitle}>
              Select a conversation to view messages.
            </p>
          </div>
          {errorMessage ? (
            <p className={styles.detailEmpty}>
              {errorMessage === "Unauthorized"
                ? "Sign in to view your inbox."
                : errorMessage}
            </p>
          ) : inbox.length === 0 ? (
            <p className={styles.detailEmpty}>No conversations yet</p>
          ) : (
            <p className={styles.detailEmpty}>Choose a conversation on the left.</p>
          )}
        </section>
      </div>
    </main>
  );
}
