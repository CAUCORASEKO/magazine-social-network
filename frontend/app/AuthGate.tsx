"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { API_BASE_URL } from "./lib/api";

const allowedWhenPending = new Set(["/onboarding", "/login", "/register", "/verify"]);

export default function AuthGate({
  children
}: {
  children: ReactNode;
}): JSX.Element | null {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkAccount(): Promise<void> {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          credentials: "include"
        });

        if (response.status === 401) {
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          account_status: "pending" | "active";
        };

        if (data.account_status === "pending") {
          if (!allowedWhenPending.has(pathname)) {
            router.replace("/onboarding");
            return;
          }
        } else if (data.account_status === "active" && pathname === "/onboarding") {
          router.replace("/");
          return;
        }
      } finally {
        if (isActive) {
          setChecking(false);
        }
      }
    }

    checkAccount();

    return () => {
      isActive = false;
    };
  }, [pathname, router]);

  if (checking) {
    return null;
  }

  return <>{children}</>;
}
