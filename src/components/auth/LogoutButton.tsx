"use client";

import { useRouter } from "next/navigation";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY, LEGACY_AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";

export function LogoutButton({ label = "Logout", onLogout }: { label?: string; onLogout?: () => void }) {
  const router = useRouter();

  function logout() {
    document.cookie = `${LEGACY_AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    onLogout?.();
    router.push(ROUTES.login);
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground transition hover:bg-surface-strong hover:text-primary"
    >
      <span className="material-symbols-outlined text-[1.25rem]" aria-hidden="true">
        logout
      </span>
      <span>{label}</span>
    </button>
  );
}
