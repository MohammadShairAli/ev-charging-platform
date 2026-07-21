import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, ROUTES } from "@/src/lib/constants";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessMode = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuth = accessMode === "auth";

  if (isAuth && (pathname === ROUTES.login || pathname === ROUTES.signup || pathname === ROUTES.forgotPassword)) {
    return NextResponse.redirect(new URL(ROUTES.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
