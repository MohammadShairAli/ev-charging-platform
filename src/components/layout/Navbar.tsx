import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-secondary/90 text-foreground shadow-[0_12px_30px_rgba(7,21,18,0.06)] backdrop-blur-xl">
      <div className="mx-0 flex max-w-[24rem] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:mx-auto sm:max-w-7xl sm:flex-nowrap sm:gap-3 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="flex min-w-0 flex-1 basis-full items-center gap-2 min-[430px]:basis-auto sm:gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-sm font-black text-secondary shadow-[0_12px_28px_rgba(0,194,168,0.25)] sm:h-10 sm:w-10">
            EV
          </span>
          <span className="max-w-[6.25rem] truncate text-sm font-semibold tracking-normal min-[380px]:max-w-[8.5rem] sm:max-w-none sm:text-lg">
            {appConfig.name}
          </span>
        </Link>
        <nav className="flex w-full shrink-0 items-center justify-center gap-1 rounded-full border border-border bg-surface-strong/70 p-1 text-xs font-semibold min-[430px]:w-auto sm:text-sm">
          <Link href={ROUTES.home} className="rounded-full px-2.5 py-2 transition hover:bg-secondary hover:text-primary sm:px-3">
            Home
          </Link>
          <Link href={ROUTES.stations} className="rounded-full px-2.5 py-2 transition hover:bg-secondary hover:text-primary sm:px-3">
            Stations
          </Link>
        </nav>
      </div>
    </header>
  );
}
