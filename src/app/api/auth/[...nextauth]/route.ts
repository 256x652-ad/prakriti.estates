import NextAuth from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { NextRequest } from "next/server";

async function authHandler(req: NextRequest, ctx: any) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
  process.env.NEXTAUTH_URL = `${proto}://${host}`;
  return NextAuth(req, ctx, authOptions);
}

export { authHandler as GET, authHandler as POST };

