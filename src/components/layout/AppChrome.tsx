"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/src/components/layout/Footer";
import { MobileBottomNav } from "@/src/components/layout/MobileBottomNav";
import { Navbar } from "@/src/components/layout/Navbar";
import { ROUTES } from "@/src/lib/constants";

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const authPage =
    pathname === ROUTES.login ||
    pathname === ROUTES.signup ||
    pathname === ROUTES.forgotPassword ||
    pathname.startsWith(ROUTES.authCallback) ||
    pathname.startsWith(ROUTES.authVerify) ||
    pathname.startsWith(ROUTES.authResetPassword);

  if (authPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <MobileBottomNav />
      <Footer />
    </>
  );
}
