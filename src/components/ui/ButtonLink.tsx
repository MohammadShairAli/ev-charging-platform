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
    "bg-[linear-gradient(135deg,var(--primary),#00a889)] text-secondary shadow-[0_14px_35px_rgba(11,91,58,0.22)] hover:brightness-105",
  secondary:
    "border border-border bg-surface text-foreground shadow-sm hover:border-primary/30 hover:text-primary",
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
