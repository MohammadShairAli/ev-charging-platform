"use client";

import { useRouter } from "next/navigation";
import { AppIcon } from "@/src/components/ui/AppIcon";
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
      <AppIcon name="logout" className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}
