"use client";

import { useEffect, useState } from "react";

import styles from "./page.module.css";

type CvModalProps = {
  cvUrl: string;
};

export default function CvModal({ cvUrl }: CvModalProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        className={styles.cvViewButton}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        View CV
      </button>
      {isOpen ? (
        <div className={styles.cvOverlay} role="dialog" aria-modal="true">
          <div className={styles.cvModal}>
            <div className={styles.cvModalHeader}>
              <p className={styles.cvModalTitle}>CV Preview</p>
              <button
                className={styles.cvClose}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close CV preview"
              >
                Close
              </button>
            </div>
            <div className={styles.cvFrame}>
              <object data={cvUrl} type="application/pdf" width="100%" height="100%">
                <iframe title="CV Preview" src={cvUrl} />
              </object>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
