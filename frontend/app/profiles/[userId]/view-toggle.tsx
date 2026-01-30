"use client";

import { useRouter } from "next/navigation";

import styles from "./page.module.css";

type ViewToggleProps = {
  isPublicView: boolean;
  profileUserId: string;
};

export default function ViewToggle({
  isPublicView,
  profileUserId
}: ViewToggleProps): JSX.Element {
  const router = useRouter();

  function handleClick(): void {
    if (isPublicView) {
      router.push(`/profiles/${profileUserId}`);
      return;
    }
    router.push(`/profiles/${profileUserId}?view=public`);
  }

  return (
    <button className={styles.viewToggle} type="button" onClick={handleClick}>
      {isPublicView ? "Back to my view" : "View as visitor"}
    </button>
  );
}
