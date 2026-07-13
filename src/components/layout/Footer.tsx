import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Footer() {
  return (
    <footer className="hidden border-t border-border bg-ink text-secondary sm:block">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-sm sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p className="text-secondary/75">&copy; {new Date().getFullYear()} {appConfig.name}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.home} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            Emergency
          </Link>
          <Link href={ROUTES.stations} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            Stations
          </Link>
          <Link href={ROUTES.costComparison} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            Compare costs
          </Link>
          <Link href={ROUTES.evDatabase} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            EV database
          </Link>
        </div>
      </div>
    </footer>
  );
}
