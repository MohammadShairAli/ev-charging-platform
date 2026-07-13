"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY, LEGACY_AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";

export function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing sign in...");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      async function finishCallback() {
        try {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const query = new URLSearchParams(window.location.search);
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          const errorDescription = hash.get("error_description") || query.get("error_description");

          if (errorDescription) {
            setMessage(errorDescription);
            return;
          }

          if (accessToken) {
            const response = await fetch("/api/auth/session", {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();

            if (!response.ok) {
              setMessage(data.message || "Signed in, but profile data could not be loaded.");
              return;
            }

            document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
            document.cookie = `${AUTH_COOKIE_NAME}=auth; path=/; samesite=lax`;
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
              mode: "auth",
              session: {
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: hash.get("token_type"),
                expires_in: hash.get("expires_in"),
                user: data.user,
              },
            }));
            router.replace(ROUTES.home);
            return;
          }

          document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
          document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setMessage("Authentication finished. Please sign in to continue.");
          window.setTimeout(() => router.replace(ROUTES.login), 900);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not finish sign in.");
        }
      }

      void finishCallback();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-primary">Authentication</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{message}</h1>
      </section>
    </main>
  );
}
