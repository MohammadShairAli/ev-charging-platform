import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  external?: boolean;
};

export function ButtonLink({ href, children, external }: ButtonLinkProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-primary-hover"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-primary-hover"
    >
      {children}
    </Link>
  );
}
