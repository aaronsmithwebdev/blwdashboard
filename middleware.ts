import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { isValidCronBearerToken } from "@/lib/security/cron";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|txt)$/i) !== null
  );
}

function isSyncOrCronApiPath(pathname: string) {
  return pathname.startsWith("/api/sync/") || pathname.startsWith("/api/cron/");
}

function withSupabaseCookies(source: NextResponse, destination: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    destination.cookies.set(cookie);
  });
  return destination;
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) {
    return res;
  }

  if (pathname === "/api/cron/full-sync") {
    return res;
  }

  if (
    isSyncOrCronApiPath(pathname) &&
    isValidCronBearerToken(req.headers.get("authorization"))
  ) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const isPublic = isPublicPath(pathname);

  if (!session && !isPublic) {
    const redirectUrl = new URL("/login", req.url);
    const redirectPath = req.nextUrl.pathname + req.nextUrl.search;
    redirectUrl.searchParams.set("redirect", redirectPath);
    return withSupabaseCookies(res, NextResponse.redirect(redirectUrl));
  }

  if (session && isPublic) {
    const redirectTo = req.nextUrl.searchParams.get("redirect") || "/";
    return withSupabaseCookies(res, NextResponse.redirect(new URL(redirectTo, req.url)));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
