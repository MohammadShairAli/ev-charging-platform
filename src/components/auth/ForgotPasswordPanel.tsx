"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/src/lib/constants";

export function ForgotPasswordPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}${ROUTES.authResetPassword}`,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password reset email could not be sent.");
      }

      setMessage(data.message || "Password reset email sent.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Password reset email could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-surface p-5 text-foreground sm:p-6">
      <p className="text-sm font-semibold text-primary">Account recovery</p>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Forgot password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Enter your account email and we will send a reset link.
      </p>

      <form className="mt-5 grid gap-4" onSubmit={requestReset}>
        <div>
          <label htmlFor="email" className="text-sm font-semibold text-foreground">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-foreground"
          />
        </div>

        {error ? <p role="alert" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{error}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{message}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset email"}
        </button>
      </form>

      <Link href={ROUTES.login} className="mt-5 inline-flex text-sm font-bold text-primary">
        Back to login
      </Link>
    </section>
  );
}
