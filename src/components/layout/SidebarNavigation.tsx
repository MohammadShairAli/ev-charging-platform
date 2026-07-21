"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/src/components/auth/LogoutButton";
import { AppIcon } from "@/src/components/ui/AppIcon";
import { appConfig } from "@/src/lib/config";
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

const primaryLinks = [
  { href: ROUTES.costComparison, label: "Cost comparison", icon: "calculate" },
  { href: ROUTES.evDatabase, label: "EV database", icon: "directions_car" },
] as const;

const secondaryLinks = [
  { href: ROUTES.home, label: "Home", icon: "home" },
  { href: ROUTES.emergency, label: "Emergency dashboard", icon: "emergency" },
  { href: ROUTES.stations, label: "Charging stations", icon: "ev_station" },
  { href: ROUTES.planTrip, label: "Plan trip", icon: "route" },
] as const;

const upcomingLinks = [
  { label: "EV Community", icon: "groups" },
  { label: "News & Alerts", icon: "campaign" },
] as const;

export function SidebarNavigation() {
  const [open, setOpen] = useState(false);
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const pathname = usePathname();

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

  function close() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-strong text-primary transition hover:border-primary"
      >
        <AppIcon name="menu" className="h-[1.35rem] w-[1.35rem]" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className="absolute inset-0 bg-ink/40"
          />
          <aside className="relative flex h-full w-[min(22rem,88vw)] flex-col border-r border-border bg-secondary shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4">
              <Link href={ROUTES.home} onClick={close} className="flex min-w-0 items-center gap-3">
                <Image src="/icon.png" alt="" width={38} height={38} className="h-9 w-9 shrink-0 object-contain" />
                <span className="truncate text-sm font-bold text-foreground">{appConfig.name}</span>
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition hover:border-primary hover:text-primary"
              >
                <AppIcon name="close" className="h-5 w-5" />
              </button>
            </div>

            <SidebarProfile auth={auth} onNavigate={close} />

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
              <SidebarGroup title="Your tools" links={primaryLinks} pathname={pathname} onNavigate={close} />
              <SidebarGroup title="Driving support" links={secondaryLinks} pathname={pathname} onNavigate={close} />
              <SidebarUpcomingGroup />
            </nav>
            <div className="border-t border-border p-3">
              <LogoutButton onLogout={close} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SidebarUpcomingGroup() {
  return (
    <div className="mb-5">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">Coming next</p>
      <div className="mt-2 grid gap-1">
        {upcomingLinks.map((link) => (
          <div
            key={link.label}
            className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted"
            aria-disabled="true"
          >
            <AppIcon name={link.icon} className="h-5 w-5 text-primary" />
            <span>{link.label}</span>
            <span className="ml-auto shrink-0 rounded-full bg-accent-soft px-2 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-primary">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidebarProfile({ auth, onNavigate }: { auth: StoredAuth | null; onNavigate: () => void }) {
  const metadata = auth?.session?.user?.user_metadata;
  const fullName = metadata?.full_name || [metadata?.first_name, metadata?.last_name].filter(Boolean).join(" ");
  const email = auth?.session?.user?.email;
  const avatar = metadata?.avatar_data_url;
  const initial = (metadata?.first_name || fullName || email || "U").trim().charAt(0).toUpperCase() || "U";
  const title = auth?.mode === "guest" ? "Guest mode" : fullName || email || "Your profile";
  const subtitle = auth?.mode === "guest" ? "Sign in to save your account" : email || "Account details";
  const profileHref = auth?.mode === "auth" ? ROUTES.profile : ROUTES.login;

  return (
    <Link
      href={profileHref}
      onClick={onNavigate}
      className="mx-3 mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition hover:border-primary"
    >
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary" aria-hidden="true">{initial}</span>
        )}
      </div>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">{subtitle}</span>
      </span>
      <AppIcon name="chevron_right" className="ml-auto h-[1.2rem] w-[1.2rem] shrink-0 text-muted" />
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

function SidebarGroup({
  title,
  links,
  pathname,
  onNavigate,
}: {
  title: string;
  links: readonly { href: string; label: string; icon: string }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-5">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2 grid gap-1">
        {links.map((link) => {
          const active = link.href === ROUTES.home ? pathname === link.href : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                active ? "bg-primary text-secondary" : "text-foreground hover:bg-surface-strong hover:text-primary"
              }`}
            >
              <AppIcon name={link.icon} className="h-5 w-5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
