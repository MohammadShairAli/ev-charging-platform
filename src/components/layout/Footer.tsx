import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-ink text-secondary">
      <div className="mx-0 flex max-w-[24rem] flex-col gap-4 px-4 py-6 text-sm sm:mx-auto sm:max-w-7xl sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-secondary/75">&copy; {new Date().getFullYear()} {appConfig.name}</p>
        <div className="flex flex-wrap gap-3">
          <Link href={ROUTES.home} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            Home
          </Link>
          <Link href={ROUTES.stations} className="rounded-full px-3 py-1.5 text-secondary/75 transition hover:bg-secondary/10 hover:text-secondary">
            Stations
          </Link>
        </div>
      </div>
    </footer>
  );
}
