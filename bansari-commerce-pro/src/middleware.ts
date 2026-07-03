import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // TODO:
  // Replace with Supabase session check
  // after Auth is connected.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};