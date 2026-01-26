"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { API_BASE_URL } from "../../lib/api";
import { IDENTITY_STATUS, type IdentityStatus } from "../../lib/verification";
import styles from "./page.module.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export default function VerifyIdentityPage(): JSX.Element {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(
    null
  );
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [showFaceStep, setShowFaceStep] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmittingFace, setIsSubmittingFace] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stepTimeoutsRef = useRef<number[]>([]);

  const isImage = useMemo(() => {
    if (!selectedFile) {
      return false;
    }
    return selectedFile.type === "image/jpeg" || selectedFile.type === "image/png";
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile || !isImage) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile, isImage]);

  useEffect(() => {
    return () => {
      stopCamera();
      clearStepTimers();
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadIdentityStatus(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load identity status.");
        }

        const data = (await response.json()) as { identity_status: IdentityStatus };
        if (isActive) {
          setIdentityStatus(data.identity_status);
          setShowFaceStep(data.identity_status === IDENTITY_STATUS.FACE_VERIFICATION);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load identity status."
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingStatus(false);
        }
      }
    }

    loadIdentityStatus();

    return () => {
      isActive = false;
    };
  }, [router]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setErrorMessage(null);
    setSuccessMessage(null);

    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setSelectedFile(null);
      setErrorMessage("Please upload a JPG, PNG, or PDF file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setErrorMessage("File size must be 10MB or smaller.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload(): Promise<void> {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append("document", selectedFile);

      const response = await fetch(`${API_BASE_URL}/profile/identity/document`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Please log in to upload your document.");
        }
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Upload failed");
      }

      setIdentityStatus(IDENTITY_STATUS.DOCUMENT_UPLOADED);
      setSuccessMessage(
        "Document uploaded successfully. Facial verification will be required next."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload document.";
      setErrorMessage(message === "Unauthorized" ? "Please log in to continue." : message);
    } finally {
      setIsUploading(false);
    }
  }

  function clearStepTimers(): void {
    stepTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    stepTimeoutsRef.current = [];
  }

  function stopCamera(): void {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setStepIndex(-1);
  }

  async function startCamera(): Promise<void> {
    setCameraMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      startGuidedSequence();
    } catch {
      setCameraMessage("Camera access is required to continue.");
      stopCamera();
    }
  }

  function startGuidedSequence(): void {
    clearStepTimers();
    setIsCapturing(true);
    setStepIndex(0);

    const steps = 4;
    const stepDuration = 2200;

    for (let index = 1; index <= steps; index += 1) {
      const timeoutId = window.setTimeout(() => {
        setStepIndex(index - 1);
        if (index === steps) {
          captureFrame();
        }
      }, stepDuration * index);
      stepTimeoutsRef.current.push(timeoutId);
    }
  }

  async function captureFrame(): Promise<void> {
    if (!videoRef.current) {
      setCameraMessage("Verification could not be completed.");
      setIsCapturing(false);
      return;
    }

    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraMessage("Verification could not be completed.");
      setIsCapturing(false);
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setCameraMessage("Verification could not be completed.");
      setIsCapturing(false);
      return;
    }

    stopCamera();
    setIsCapturing(false);
    await submitFaceCapture(blob);
  }

  async function submitFaceCapture(blob: Blob): Promise<void> {
    setIsSubmittingFace(true);
    setCameraMessage(null);
    try {
      const formData = new FormData();
      formData.append("face", blob, "face.jpg");

      const response = await fetch(`${API_BASE_URL}/profile/verify-face`, {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Verification could not be completed.");
      }

      router.push("/profile");
    } catch {
      setCameraMessage("Verification could not be completed.");
    } finally {
      setIsSubmittingFace(false);
    }
  }

  const shouldShowUploader =
    identityStatus === null ||
    identityStatus === IDENTITY_STATUS.UNVERIFIED ||
    identityStatus === IDENTITY_STATUS.REJECTED;

  const shouldShowDocumentReceived =
    identityStatus === IDENTITY_STATUS.DOCUMENT_UPLOADED;

  const shouldShowFaceStep =
    identityStatus === IDENTITY_STATUS.FACE_VERIFICATION || showFaceStep;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Identity verification</h1>
          <p className={styles.subhead}>
            Upload a government-issued ID to start identity verification. This is
            required before facial verification can begin.
          </p>
        </header>

        {isLoadingStatus ? (
          <p className={styles.loading}>Loading verification status...</p>
        ) : null}

        {!isLoadingStatus && shouldShowUploader ? (
          <div className={styles.uploadArea}>
            <label className={styles.fileInput}>
              <span>Select document</span>
              <span className={styles.uploadHint}>
                JPG, PNG, or PDF • 10 MB max
              </span>
              <input
                className={styles.fileField}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
              />
            </label>

            {selectedFile && (
              <div className={styles.fileSummary}>
                <div>
                  <p className={styles.fileLabel}>Selected file</p>
                  <p className={styles.fileName}>{selectedFile.name}</p>
                </div>
                {previewUrl && (
                  <div className={styles.previewBox}>
                    <img
                      className={styles.previewImage}
                      src={previewUrl}
                      alt="Selected identity document preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {!isLoadingStatus && shouldShowDocumentReceived ? (
          <div className={styles.infoCard}>
            <p className={styles.infoTitle}>
              Document received. Continue with facial verification.
            </p>
            <p className={styles.infoCopy}>
              We will guide you through a short camera check in the next step.
            </p>
            {!shouldShowFaceStep ? (
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setShowFaceStep(true)}
              >
                Continue to facial verification
              </button>
            ) : null}
          </div>
        ) : null}

        {!isLoadingStatus && shouldShowFaceStep ? (
          <div className={styles.faceStep}>
            <div className={styles.faceHeader}>
              <div>
                <p className={styles.infoTitle}>Facial verification</p>
                <p className={styles.infoCopy}>
                  Keep your face centered and follow the prompts.
                </p>
              </div>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={startCamera}
                disabled={isCameraActive || isCapturing || isSubmittingFace}
              >
                {isCameraActive ? "Camera active" : "Start facial verification"}
              </button>
            </div>

            <div className={styles.videoShell}>
              {isCameraActive ? (
                <video
                  className={styles.video}
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                />
              ) : (
                <div className={styles.videoPlaceholder}>
                  Camera preview will appear here.
                </div>
              )}
              {isCapturing || isSubmittingFace ? (
                <div className={styles.processingOverlay}>
                  <span>{isSubmittingFace ? "Verifying..." : "Capturing..."}</span>
                </div>
              ) : null}
            </div>

            <div className={styles.instructions}>
              <p
                className={`${styles.instruction} ${
                  stepIndex === 0 ? styles.instructionActive : ""
                }`}
              >
                Look straight at the camera
              </p>
              <p
                className={`${styles.instruction} ${
                  stepIndex === 1 ? styles.instructionActive : ""
                }`}
              >
                Slowly turn your head left
              </p>
              <p
                className={`${styles.instruction} ${
                  stepIndex === 2 ? styles.instructionActive : ""
                }`}
              >
                Slowly turn your head right
              </p>
              <p
                className={`${styles.instruction} ${
                  stepIndex === 3 ? styles.instructionActive : ""
                }`}
              >
                Blink once
              </p>
            </div>
          </div>
        ) : null}

        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        {successMessage && <p className={styles.success}>{successMessage}</p>}
        {cameraMessage && <p className={styles.error}>{cameraMessage}</p>}

        {shouldShowUploader ? (
          <button
            className={styles.primaryButton}
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload document"}
          </button>
        ) : null}

        <Link className={styles.backLink} href="/profile">
          Back to profile
        </Link>
      </section>
    </main>
  );
}
