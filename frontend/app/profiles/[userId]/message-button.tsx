"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./page.module.css";
import { API_BASE_URL } from "../../lib/api";

type MessageButtonProps = {
  recipientUserId: string;
};

export default function MessageButton({
  recipientUserId
}: MessageButtonProps): JSX.Element {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(): Promise<void> {
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/messages/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recipientUserId })
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data?.error || "Unable to send message.");
      }

      const result = (await response.json()) as { conversationId: string };
      router.push(`/messages/${result.conversationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        className={styles.messageButton}
        type="button"
        onClick={handleStart}
        disabled={isSending}
        aria-label="Message"
        aria-busy={isSending}
        title={isSending ? "Starting conversation" : "Message"}
      >
        <span className={styles.messageIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" role="presentation">
            <path
              d="M7.5 16.5H7l-3.5 3V6.75C3.5 5.78 4.28 5 5.25 5h13.5C19.72 5 20.5 5.78 20.5 6.75v6.5c0 .97-.78 1.75-1.75 1.75H7.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {error ? <p className={styles.messageError}>{error}</p> : null}
    </>
  );
}
