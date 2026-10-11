import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * PRODUCTION MIDDLEWARE & ROUTE GUARDS
 * Enforces session authentication, admin RBAC authorization, and mandatory KYC verification.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract session token securely from cookies using NextAuth secret
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRoles = (token?.roles as string[]) || [];
  const kycStatus = (token?.kycStatus as string) || "PENDING";

  // 1. Unauthenticated users attempting to access /dashboard, /checkout, or /admin -> redirect to /login
  const isProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin");

  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users without ADMIN or SUPER_ADMIN attempting /admin -> redirect to / or /403
  if (pathname.startsWith("/admin")) {
    const hasAdminRole =
      userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

    if (!hasAdminRole) {
      const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
      console.warn(`[Security Alert] Unauthorized access attempt to /admin from IP: ${clientIp}`);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // 3. Users attempting to access /checkout without verified KYC -> redirect to /kyc-verification
  if (pathname.startsWith("/checkout")) {
    if (kycStatus !== "VERIFIED") {
      const kycUrl = new URL("/kyc-verification", request.url);
      kycUrl.searchParams.set("callbackUrl", pathname);
      kycUrl.searchParams.set("reason", "kyc_required_for_checkout");
      return NextResponse.redirect(kycUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/checkout/:path*",
    "/admin/:path*",
  ],
};
