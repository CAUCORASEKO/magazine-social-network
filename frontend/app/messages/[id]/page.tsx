"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";

interface MessageItem {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ConversationPeer {
  id: string;
  full_name: string;
  profile_image_url: string | null;
}

interface MeResponse {
  id: string;
}

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

async function fetchMe(): Promise<MeResponse | null> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
    cache: "no-store"
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Unable to load session");
  }
  return (await response.json()) as MeResponse;
}

async function fetchInbox(): Promise<InboxConversation[]> {
  const response = await fetch(`${API_BASE_URL}/messages/inbox`, {
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

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatDayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Today";
  }
  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(date);
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeStyle: "short"
  }).format(date);
}

function formatInboxTime(value: string | null): string {
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

type ThreadItem =
  | { type: "separator"; id: string; label: string }
  | { type: "message"; message: MessageItem };

export default function ConversationPage({
  params
}: {
  params: { id: string };
}): JSX.Element {
  const conversationId = params.id;
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [peer, setPeer] = useState<ConversationPeer | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxConversation[]>([]);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
        credentials: "include",
        cache: "no-store"
      });

      if (response.status === 401) {
        setError("Unauthorized");
        return;
      }

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to load conversation");
      }

      const data = (await response.json()) as {
        messages: MessageItem[];
        other_user: ConversationPeer;
      };
      setMessages(data.messages);
      setPeer(data.other_user);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load conversation");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  const loadInbox = useCallback(async () => {
    try {
      const data = await fetchInbox();
      setInbox(data);
      setInboxError(null);
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : "Unable to load inbox");
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    fetchMe()
      .then((data) => setMeId(data?.id ?? null))
      .catch(() => setMeId(null));

    loadMessages();
    loadInbox();
    intervalId = setInterval(loadMessages, 3000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [loadInbox, loadMessages]);

  const formattedMessages = useMemo(() => messages, [messages]);

  const threadItems = useMemo((): ThreadItem[] => {
    const items: ThreadItem[] = [];
    let lastKey = "";

    formattedMessages.forEach((message) => {
      const createdAt = new Date(message.created_at);
      const dayKey = getDayKey(createdAt);
      if (dayKey !== lastKey) {
        items.push({
          type: "separator",
          id: `sep-${dayKey}`,
          label: formatDayLabel(createdAt)
        });
        lastKey = dayKey;
      }
      items.push({ type: "message", message });
    });

    return items;
  }, [formattedMessages]);

  useEffect(() => {
    if (!bottomRef.current) {
      return;
    }
    bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [formattedMessages]);

  async function handleSend(): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ message: trimmed })
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to send message");
      }
      setText("");
      await loadMessages();
      await loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <Link className={styles.backLink} href="/messages">
              Back to inbox
            </Link>
            <h1 className={styles.sidebarTitle}>Messages</h1>
          </div>

          {inboxError === "Unauthorized" ? (
            <p className={styles.sidebarEmpty}>Sign in to view your inbox.</p>
          ) : null}

          {inboxError && inboxError !== "Unauthorized" ? (
            <p className={styles.sidebarEmpty}>{inboxError}</p>
          ) : null}

          {!inboxError && inbox.length === 0 ? (
            <p className={styles.sidebarEmpty}>No conversations yet.</p>
          ) : null}

          {!inboxError && inbox.length > 0 ? (
            <ul className={styles.sidebarList}>
              {inbox.map((item) => {
                const isActive = item.conversation_id === conversationId;
                return (
                  <li key={item.conversation_id} className={styles.sidebarItem}>
                    <Link
                      className={`${styles.sidebarLink} ${
                        isActive ? styles.sidebarLinkActive : ""
                      }`}
                      href={`/messages/${item.conversation_id}`}
                    >
                      <div className={styles.sidebarAvatar}>
                      {resolveAvatarUrl(item.peer_user.profile_image_url) ? (
                        <img
                          src={resolveAvatarUrl(item.peer_user.profile_image_url) ?? ""}
                          alt={`${item.peer_user.full_name} avatar`}
                        />
                      ) : (
                        <span>{getInitials(item.peer_user.full_name)}</span>
                      )}
                    </div>
                    <div className={styles.sidebarContent}>
                      <div className={styles.sidebarRow}>
                        <span className={styles.sidebarName}>
                            {item.peer_user.full_name}
                        </span>
                          <span className={styles.sidebarTime}>
                            {formatInboxTime(item.last_message?.created_at ?? item.created_at)}
                          </span>
                        </div>
                        <p className={styles.sidebarPreview}>
                          {item.last_message
                            ? item.last_message.sender_id === meId
                              ? `You: ${item.last_message.body}`
                              : item.last_message.body
                            : "No messages yet"}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </aside>

        <section className={styles.conversationPanel}>
          <div className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.avatar}>
                {peer?.profile_image_url ? (
                  <img
                    src={
                      peer.profile_image_url.startsWith("/")
                        ? `${API_BASE_URL}${peer.profile_image_url}`
                        : peer.profile_image_url
                    }
                    alt={`${peer.full_name} avatar`}
                  />
                ) : (
                  <span>{peer ? getInitials(peer.full_name) : "—"}</span>
                )}
              </div>
              <div className={styles.headerText}>
                <h1 className={styles.title}>
                  {peer?.full_name ?? "Conversation"}
                </h1>
                <p className={styles.subtitle}>Private conversation</p>
              </div>
            </div>
          </div>

          {error === "Unauthorized" ? (
            <p className={styles.emptyState}>Sign in to view this conversation.</p>
          ) : null}

          {error && error !== "Unauthorized" ? (
            <p className={styles.emptyState}>{error}</p>
          ) : null}

          {!error ? (
            <>
              <div className={styles.thread}>
                {isLoading ? (
                  <p className={styles.emptyState}>Loading messages…</p>
                ) : null}
                {!isLoading && formattedMessages.length === 0 ? (
                  <p className={styles.emptyState}>No messages yet</p>
                ) : null}
                <ul className={styles.messageList}>
                  {threadItems.map((item) => {
                    if (item.type === "separator") {
                      return (
                        <li key={item.id} className={styles.daySeparator}>
                          <span>{item.label}</span>
                        </li>
                      );
                    }
                    const message = item.message;
                    const isMine = meId && message.sender_id === meId;
                    return (
                      <li
                        key={message.id}
                        className={`${styles.messageItem} ${
                          isMine ? styles.messageMine : styles.messageTheirs
                        }`}
                      >
                        <span className={styles.messageAuthor}>
                          {isMine ? "You" : peer?.full_name ?? "Unknown"}
                        </span>
                        <div className={styles.messageBubble}>{message.body}</div>
                        <span className={styles.messageTime}>
                          {formatTime(message.created_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div ref={bottomRef} />
              </div>

              <div className={styles.composer}>
                <textarea
                  className={styles.textarea}
                  rows={2}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Write a message..."
                />
                <button
                  className={styles.sendButton}
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !text.trim()}
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
