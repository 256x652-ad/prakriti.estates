import { getServerSession } from "next-auth/next";
import { authOptions } from "./authOptions";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export type AuthenticatedUser = {
  id: string;
  role: Role;
};

type RouteHandler = (
  req: Request,
  user: AuthenticatedUser,
  params: any
) => Promise<NextResponse> | NextResponse;

/**
 * HOC for Route Handlers enforcing Role-Based Access Control
 */
export function withRole(allowedRoles: Role[], handler: RouteHandler) {
  return async (req: Request, context: any) => {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as AuthenticatedUser;

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden: Insufficient Permissions" }, { status: 403 });
    }

    return handler(req, user, context.params);
  };
}

/**
 * Utility for Server Actions enforcing Role-Based Access Control
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const user = session.user as AuthenticatedUser;

  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }

  return user;
}
