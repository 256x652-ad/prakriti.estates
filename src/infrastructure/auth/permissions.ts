import { Role } from "@prisma/client";

export type Permission = 
  | "property:create"
  | "property:update"
  | "property:delete"
  | "property:verify"
  | "transaction:refund"
  | "transaction:view_all"
  | "consultancy:respond"
  | "kyc:review";

const rolePermissions: Record<Role, Permission[]> = {
  USER: [],
  BUYER: ["property:update"], // E.g., updating their own saved lists (handled by ownership checks too)
  SELLER: ["property:create", "property:update", "property:delete"],
  AGENT: ["property:create", "property:update", "property:delete"],
  CONSULTANT: ["consultancy:respond"],
  ADMIN: [
    "property:create", 
    "property:update", 
    "property:delete", 
    "property:verify", 
    "transaction:refund", 
    "transaction:view_all",
    "consultancy:respond",
    "kyc:review"
  ]
};

/**
 * Validates if any of the user's roles grant the requested permission.
 */
export function hasPermission(userRoles: Role[], permission: Permission): boolean {
  if (userRoles.includes("ADMIN")) return true; // Admins override

  return userRoles.some(role => {
    const permissions = rolePermissions[role];
    return permissions ? permissions.includes(permission) : false;
  });
}
