"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AUTH_STORAGE_KEY, ROUTES } from "@/src/lib/constants";

type StoredAuth = {
  mode?: "guest" | "auth";
  session?: {
    access_token?: string;
    user?: {
      email?: string;
      user_metadata?: {
        first_name?: string;
        last_name?: string;
        full_name?: string;
        avatar_data_url?: string;
      };
    };
  };
};

function profileInitial(auth: StoredAuth | null) {
  if (auth?.mode === "guest") {
    return "G";
  }

  const metadata = auth?.session?.user?.user_metadata;
  const value = metadata?.first_name || metadata?.full_name || auth?.session?.user?.email || "U";

  return value.trim().charAt(0).toUpperCase() || "U";
}

export function ProfileAvatarLink() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const storedAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "null") as StoredAuth | null;
        setAuth(storedAuth);

        if (storedAuth?.mode === "auth" && storedAuth.session?.access_token && !storedAuth.session.user) {
          void refreshStoredUser(storedAuth).then(setAuth);
        }
      } catch {
        setAuth(null);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  const avatar = auth?.session?.user?.user_metadata?.avatar_data_url;
  const initial = profileInitial(auth);
  const profileHref = auth?.mode === "auth" ? ROUTES.profile : ROUTES.login;

  return (
    <Link
      href={profileHref}
      aria-label="Open profile"
      className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-strong text-sm font-bold text-primary transition hover:border-primary sm:h-11 sm:w-11"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </Link>
  );
}

async function refreshStoredUser(auth: StoredAuth) {
  const token = auth.session?.access_token;

  if (!token) {
    return auth;
  }

  const response = await fetch("/api/auth/session", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (!response.ok) {
    return auth;
  }

  const nextAuth = {
    ...auth,
    session: {
      ...auth.session,
      user: data.user,
    },
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextAuth));

  return nextAuth;
}
