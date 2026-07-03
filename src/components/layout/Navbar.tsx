import Image from "next/image";
import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-secondary text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Image
            src="/icon.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
          />
          <span className="truncate text-sm font-semibold tracking-normal sm:text-lg">
            {appConfig.name}
          </span>
        </Link>
        <Link
          href={ROUTES.profile}
          aria-label="Open profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface-strong text-primary transition hover:border-primary sm:hidden"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
          </svg>
        </Link>
        <nav className="hidden shrink-0 items-center justify-center gap-1 rounded-full border border-border bg-surface-strong/70 p-1 text-sm font-semibold sm:flex">
          <Link href={ROUTES.home} className="rounded-full px-2.5 py-2 transition hover:bg-secondary hover:text-primary sm:px-3">
            Home
          </Link>
          <Link href={ROUTES.stations} className="rounded-full px-2.5 py-2 transition hover:bg-secondary hover:text-primary sm:px-3">
            Stations
          </Link>
          <Link href={ROUTES.profile} className="rounded-full px-2.5 py-2 transition hover:bg-secondary hover:text-primary sm:px-3">
            Profile
          </Link>
        </nav>
      </div>
    </header>
  );
}
