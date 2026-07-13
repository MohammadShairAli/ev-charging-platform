"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { AUTH_STORAGE_KEY, ROUTES } from "@/src/lib/constants";

export function EmailVerifyPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error" | "rejected">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const tokenHash = params.get("token_hash") || params.get("tokenHash") || "";
  const type = params.get("type") || "signup";

  async function verify() {
    setStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash, type }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed.");
      }

      if (data.session?.access_token) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ mode: "auth", session: data.session }));
      }

      setStatus("done");
      setMessage(data.message || "Email verified.");
      window.setTimeout(() => router.push(ROUTES.home), 900);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Verification failed.");
    }
  }

  function reject() {
    setStatus("rejected");
    setMessage("Verification cancelled. No account change was confirmed.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center">
        <p className="text-sm font-semibold text-primary">Email verification</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Is this you?</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Confirm only if you requested this signup or email change.
        </p>

        {message ? (
          <p role="status" className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            {message}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={verify}
            disabled={status === "loading" || !tokenHash}
            className="min-h-12 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Verifying..." : "Verify it’s me"}
          </button>
          <button
            type="button"
            onClick={reject}
            disabled={status === "loading"}
            className="min-h-12 rounded-lg border border-border bg-secondary px-4 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            No, it’s not me
          </button>
        </div>

        <Link href={ROUTES.login} className="mt-5 inline-flex text-sm font-bold text-primary">
          Back to login
        </Link>
      </section>
    </main>
  );
}
