"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AUTH_STORAGE_KEY, ROUTES } from "@/src/lib/constants";

export function ResetPasswordPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tokenHash = params.get("token_hash") || params.get("tokenHash") || "";
  const type = params.get("type") || "recovery";

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash, type, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset failed.");
      }

      if (data.session?.access_token) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ mode: "auth", session: data.session }));
      }

      setMessage(data.message || "Password updated.");
      window.setTimeout(() => router.push(ROUTES.home), 900);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-foreground">
        <p className="text-sm font-semibold text-primary">Account recovery</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Set new password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Choose a new password for your account.
        </p>

        <form className="mt-5 grid gap-4" onSubmit={resetPassword}>
          <PasswordField name="password" label="New password" />
          <PasswordField name="confirmPassword" label="Confirm password" />

          {error ? <p role="alert" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{error}</p> : null}
          {message ? <p role="status" className="rounded-lg border border-primary/40 bg-background p-3 text-sm text-foreground">{message}</p> : null}

          <button
            type="submit"
            disabled={loading || !tokenHash}
            className="min-h-12 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        {!tokenHash ? (
          <p className="mt-4 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
            Reset token is missing. Request a new password reset email.
          </p>
        ) : null}

        <Link href={ROUTES.login} className="mt-5 inline-flex text-sm font-bold text-primary">
          Back to login
        </Link>
      </section>
    </main>
  );
}

function PasswordField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <label htmlFor={name} className="text-sm font-semibold text-foreground">{label}</label>
      <input
        id={name}
        name={name}
        type="password"
        autoComplete="new-password"
        required
        minLength={6}
        className="mt-2 min-h-12 w-full rounded-lg border border-border bg-secondary px-4 text-base text-foreground"
      />
    </div>
  );
}
