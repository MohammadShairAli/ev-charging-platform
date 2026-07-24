"use client";

import { FormEvent, MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { SavedCarsEditor } from "@/src/components/vehicle/SavedCarsEditor";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY, LEGACY_AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";
import {
  normalizeStoredCars,
  PENDING_SIGNUP_CARS_KEY,
  PROFILE_STORAGE_KEY,
  type StoredCar,
  type StoredProfile,
} from "@/src/lib/local-storage";

type Mode = "login" | "signup";

export function AuthPanel({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [cars, setCars] = useState<StoredCar[]>([]);

  function enterGuest() {
    document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    document.cookie = `${AUTH_COOKIE_NAME}=guest; path=/; samesite=lax`;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ mode: "guest" }));
    router.push(ROUTES.home);
  }

  const authError = searchParams.get("authError");
  const verificationEmail = searchParams.get("verificationEmail") || "";

  async function handleImage(file?: File) {
    if (!file) {
      setImage(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    try {
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Login failed.");
        }

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ mode: "auth", session: data.session }));
        persistCars(normalizeStoredCars(data.session?.user?.user_metadata?.cars));
        router.push(ROUTES.home);
        return;
      }

      if (!cars.length) {
        throw new Error("Add at least one car before creating your account.");
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: String(form.get("firstName") || ""),
          lastName: String(form.get("lastName") || ""),
          phone: String(form.get("phone") || ""),
          email,
          password,
          image,
          cars,
          redirectTo: `${window.location.origin}${ROUTES.authVerify}`,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed.");
      }

      persistCars(cars);

      if (data.session) {
        document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
        document.cookie = `${AUTH_COOKIE_NAME}=auth; path=/; samesite=lax`;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ mode: "auth", session: data.session }));
        router.push(ROUTES.home);
        return;
      }

      setMessage(data.message || "Verification email sent. Open it to confirm your email, then login.");
      setVerificationSent(true);
      window.setTimeout(() => router.push(`${ROUTES.login}?verificationEmail=${encodeURIComponent(email)}`), 2200);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    const email = verificationEmail.trim();

    if (!email) {
      setError("Enter your email first, then request another verification email.");
      return;
    }

    setResending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}${ROUTES.authVerify}`,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification email could not be resent.");
      }

      setMessage(data.message || "Verification email requested. Check your inbox and spam folder.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Verification email could not be resent.");
    } finally {
      setResending(false);
    }
  }

  function prepareGoogleSignup(event: MouseEvent<HTMLAnchorElement>) {
    if (mode !== "signup") {
      sessionStorage.removeItem(PENDING_SIGNUP_CARS_KEY);
      return;
    }

    if (!cars.length) {
      event.preventDefault();
      setError("Add at least one car before creating your account.");
      return;
    }

    persistCars(cars);
    sessionStorage.setItem(PENDING_SIGNUP_CARS_KEY, JSON.stringify(cars));
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-lg border border-border bg-surface p-4 text-foreground sm:p-6">
      {verificationSent ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4">
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 text-center shadow-xl"
          >
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-secondary">
              <AppIcon name="mark_email_read" className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-foreground">Verification email sent</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Open the email to verify your account. You will be redirected to login, where you can resend it if needed.
            </p>
          </div>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-primary">{mode === "login" ? "Welcome back" : "Create account"}</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">
          {mode === "login" ? "Login to continue" : "Signup for EV support"}
        </h1>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        {mode === "signup" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="firstName" label="First name" autoComplete="given-name" required />
              <TextField name="lastName" label="Last name" autoComplete="family-name" required />
            </div>
            <TextField name="phone" label="Phone number" type="tel" autoComplete="tel" required />
            <div>
              <label htmlFor="avatar" className="text-sm font-semibold text-foreground">Profile image</label>
              <input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/*"
                onChange={(event) => void handleImage(event.target.files?.[0])}
                className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-foreground"
              />
              <p className="mt-1 text-xs text-muted">Optional.</p>
            </div>
            <SavedCarsEditor cars={cars} onChange={setCars} />
          </>
        ) : null}

        <TextField name="email" label="Email" type="email" autoComplete="email" required defaultValue={mode === "login" ? verificationEmail : ""} />
        <TextField name="password" label="Password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} />

        {mode === "login" ? (
          <div className="-mt-2 flex justify-end">
            <Link href={ROUTES.forgotPassword} className="text-sm font-bold text-primary">
              Forgot password?
            </Link>
          </div>
        ) : null}

        {error || authError ? <p role="alert" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{error || authError}</p> : null}
        {message ? <p role="status" className="rounded-lg border border-border bg-background p-3 text-sm text-foreground">{message}</p> : null}

        {mode === "login" && verificationEmail ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm leading-6 text-muted">
              Did not receive the verification email for <span className="font-semibold text-foreground">{verificationEmail}</span>?
            </p>
            <button
              type="button"
              onClick={resendVerification}
              disabled={resending}
              className="mt-3 min-h-10 rounded-lg border border-border bg-surface px-4 text-sm font-bold text-foreground transition hover:border-border hover:text-primary disabled:cursor-wait disabled:opacity-60"
            >
              {resending ? "Requesting..." : "Resend verification email"}
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-lg bg-primary px-4 text-sm font-bold text-secondary transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? ROUTES.signup : ROUTES.login} className="font-bold text-primary">
          {mode === "login" ? "Create one" : "Login"}
        </Link>
      </p>

      <div className="mt-4 grid gap-3">
        <a
          href="/api/auth/google"
          onClick={prepareGoogleSignup}
          className="inline-flex min-h-12 items-center justify-center gap-3 rounded border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-strong hover:shadow disabled:opacity-60"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </a>
        <button
          type="button"
          onClick={enterGuest}
          className="min-h-12 rounded-lg border border-border bg-background px-4 text-sm font-bold text-foreground transition hover:border-border hover:text-primary"
        >
          Use as guest
        </button>
      </div>
    </section>
  );
}

function persistCars(cars: StoredCar[]) {
  if (!cars.length) {
    return;
  }

  let profile: StoredProfile = {};

  try {
    profile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) || "{}") as StoredProfile;
  } catch {
    profile = {};
  }

  const firstCar = cars[0];
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
    ...profile,
    cars,
    car: {
      make: firstCar.make,
      model: firstCar.model,
      variant: firstCar.variant,
      kind: firstCar.kind,
      rangeKm: firstCar.rangeKm,
    },
  }));
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 18 18">
      <path
        fill="#000000"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#000000"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#000000"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3-2.33z"
      />
      <path
        fill="#000000"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.97l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

function TextField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div>
      <label htmlFor={props.name} className="text-sm font-semibold text-foreground">{label}</label>
      <input
        id={props.name}
        className="mt-2 min-h-12 w-full rounded-lg border border-border bg-surface px-4 text-base text-foreground placeholder:text-muted/70"
        {...props}
      />
    </div>
  );
}
