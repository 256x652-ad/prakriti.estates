import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// In a real app with NextAuth, you would import the auth middleware
// import { auth } from "@/auth";

export function middleware(request: NextRequest) {
  // 1. Check if the route is under /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    
    // 2. Mocking NextAuth token retrieval for demonstration
    // const session = await auth();
    // const roles = session?.user?.roles || [];
    
    // Simulated token payload
    const mockUserRoles = ["USER"]; // Imagine this is fetched from cookies

    // 3. Strict RBAC Block
    if (!mockUserRoles.includes("ADMIN")) {
      const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
      console.warn(`[Security] Unauthorized access attempt to /admin from IP: ${clientIp}`);
      // Redirect to a 403 or home page
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"], // Apply only to admin routes
};
