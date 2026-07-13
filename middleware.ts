import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";

const publicPrefixes = [
  ROUTES.login,
  ROUTES.signup,
  ROUTES.forgotPassword,
  ROUTES.authCallback,
  ROUTES.authVerify,
  ROUTES.authResetPassword,
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/icon.png",
  "/ev-hero.png",
  "/Car_data",
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessMode = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuth = accessMode === "auth";
  const isGuest = accessMode === "guest";
  const hasAccessMode = isAuth || isGuest;
  const publicRoute = publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!hasAccessMode && !publicRoute) {
    return NextResponse.redirect(new URL(ROUTES.login, request.url));
  }

  if (isAuth && (pathname === ROUTES.login || pathname === ROUTES.signup || pathname === ROUTES.forgotPassword)) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
