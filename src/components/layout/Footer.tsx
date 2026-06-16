import Link from "next/link";
import { appConfig } from "@/src/lib/config";
import { ROUTES } from "@/src/lib/constants";

export function Footer() {
  return (
    <footer className="bg-primary text-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>&copy; {new Date().getFullYear()} {appConfig.name}</p>
        <div className="flex gap-4">
          <Link href={ROUTES.home} className="hover:text-secondary/80">
            Home
          </Link>
          <Link href={ROUTES.stations} className="hover:text-secondary/80">
            Stations
          </Link>
        </div>
      </div>
    </footer>
  );
}
