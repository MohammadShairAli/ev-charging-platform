"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/src/lib/constants";

const tabs = [
  {
    href: ROUTES.home,
    label: "Home",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <path d="M4 10.7 12 4l8 6.7V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9.3Z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: ROUTES.planTrip,
    label: "Plan my trip",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18h2.2a3 3 0 0 0 3-3v-6a3 3 0 0 1 3-3h.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

const searchIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-2">
    <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    <circle cx="10.8" cy="10.8" r="6.8" />
  </svg>
);

export function MobileBottomNav() {
  const pathname = usePathname();
  const searchActive = pathname.startsWith(ROUTES.stations);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[60] px-4 sm:hidden" aria-label="Primary navigation">
      <div className="mx-auto max-w-[24rem] rounded-t-[1.6rem] border border-border bg-surface px-3 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-3 items-end">
          <MobileTab tab={tabs[0]} active={pathname === ROUTES.home} />

          <div className="flex min-h-14 flex-col items-center justify-end gap-1 text-xs font-semibold">
            <Link
              href={ROUTES.stations}
              aria-label="Search charging stations"
              aria-current={searchActive ? "page" : undefined}
              className={`-mt-8 grid h-16 w-16 place-items-center rounded-full border-8 border-border transition ${
                searchActive ? "bg-primary text-secondary" : "bg-primary text-secondary hover:bg-primary-hover"
              }`}
            >
              {searchIcon}
            </Link>
            <span className={searchActive ? "text-primary" : "text-muted"}>Search</span>
          </div>

          <MobileTab tab={tabs[1]} active={pathname.startsWith(ROUTES.planTrip)} />
        </div>
      </div>
    </nav>
  );
}

function MobileTab({ tab, active }: { tab: (typeof tabs)[number]; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 min-w-0 flex-col items-center justify-end gap-1 rounded-xl px-1 text-[0.68rem] font-semibold transition ${
        active ? "text-primary" : "text-muted hover:text-primary"
      }`}
    >
      <span>{tab.icon}</span>
      <span className="whitespace-nowrap">{tab.label}</span>
    </Link>
  );
}
