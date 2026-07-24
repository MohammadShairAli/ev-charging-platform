import Link from "next/link";
import type { ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  external?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
};

const baseClasses =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-auto";

const variantClasses = {
  primary:
    "bg-primary text-secondary hover:bg-primary-hover",
  secondary:
    "border border-border bg-surface text-foreground hover:border-border hover:text-primary",
};

export function ButtonLink({ href, children, external, variant = "primary", className = "" }: ButtonLinkProps) {
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={classes}
    >
      {children}
    </Link>
  );
}
