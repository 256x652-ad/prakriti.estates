"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { PropertyLifecycleService } from "@/modules/properties/services/PropertyLifecycleService";
import { revalidatePropertyListing } from "@/lib/seo/revalidateProperty";
import { revalidatePath } from "next/cache";

export async function approvePropertyAction(propertyId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN: Admin permissions required");
  }

  // 1. Verify Property Owner KYC status if required
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { owner: true },
  });

  if (!property) {
    throw new Error("Property not found");
  }

  // 2. Transition state to PUBLISHED and emit Outbox event
  const updated = await PropertyLifecycleService.transitionStatus(
    propertyId,
    "PUBLISHED",
    userRoles
  );

  // 3. Purge edge cache and sitemap
  await revalidatePropertyListing(updated.slug || updated.id);
  revalidatePath("/admin/properties/pending");
  revalidatePath("/search");

  return { success: true, property: updated };
}

export async function rejectPropertyAction(propertyId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN");
  }

  const updated = await PropertyLifecycleService.transitionStatus(
    propertyId,
    "REJECTED",
    userRoles
  );

  revalidatePath("/admin/properties/pending");
  return { success: true, property: updated };
}
