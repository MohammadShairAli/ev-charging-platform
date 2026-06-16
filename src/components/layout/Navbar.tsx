import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Navbar() {
  return (
    <header className="bg-primary text-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="text-lg font-semibold tracking-normal">
          {appConfig.name}
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href={ROUTES.home} className="transition hover:text-secondary/80">
            Home
          </Link>
          <Link href={ROUTES.stations} className="transition hover:text-secondary/80">
            Charging Stations
          </Link>
        </nav>
      </div>
    </header>
  );
}
