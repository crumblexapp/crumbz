import { NextResponse, type NextRequest } from "next/server";
import { SITE_AUTH_COOKIE, hasValidAuthToken } from "@/lib/site-auth";

const PUBLIC_PATH_PREFIXES = ["/_next", "/api", "/unlock"];
const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE_PATTERN.test(pathname)
  ) {
    return NextResponse.next();
  }

  const authToken = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  if (hasValidAuthToken(authToken)) {
    return NextResponse.next();
  }

  const unlockUrl = new URL("/unlock", request.url);
  if (pathname !== "/") {
    unlockUrl.searchParams.set("from", pathname);
  }

  return NextResponse.redirect(unlockUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
