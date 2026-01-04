import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_IPS = [
  // "127.0.0.1",
  // "::1",
  // "localhost",
  // "::ffff:172.18.0.1",
  "**.*.*.*", // Allow all IPs
  // Add your IP(s) below:
  // "YOUR.IP.HERE",
];

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.nextUrl.hostname ||
    "unknown"
  );
}

function isAllowedIP(ip: string): boolean {
  return ALLOWED_IPS.some((allowed) => {
    if (allowed.includes("*")) {
      const pattern = allowed.replace(/\./g, "\\.").replace(/\*/g, ".*");
      return new RegExp(`^${pattern}$`).test(ip);
    }
    return ip === allowed;
  });
}

export default withAuth(
  function middleware(req) {
    const ip = getClientIP(req);

    // IP Whitelist check
    if (!isAllowedIP(ip)) {
      console.log(`[BLOCKED] Unauthorized IP: ${ip}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages and API routes
        if (
          req.nextUrl.pathname.startsWith("/auth") ||
          req.nextUrl.pathname.startsWith("/api/auth")
        ) {
          return true;
        }
        // Require authentication for all other routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - auth (authentication pages)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets folder)
     */
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|assets).*)",
  ],
};
