import { prisma } from "@/infrastructure/database/prisma";
import { LifecycleStatus, PropertyType, Prisma } from "@prisma/client";

export class PropertyLifecycleService {
  /**
   * Enforces legal state transitions for properties:
   * DRAFT -> PENDING_APPROVAL
   * PENDING_APPROVAL -> PUBLISHED (Admin only)
   * PENDING_APPROVAL -> REJECTED (Admin only)
   * PUBLISHED -> ARCHIVED
   */
  static async transitionStatus(propertyId: string, targetStatus: LifecycleStatus, actorRoles: string[]) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error("Property not found");

    const current = property.lifecycleStatus;
    const isAdmin = actorRoles.includes("ADMIN") || actorRoles.includes("SUPER_ADMIN");

    if (current === targetStatus) return property;

    if (current === "DRAFT" && targetStatus === "PENDING_APPROVAL") {
      // Allowed for owner / seller
    } else if (current === "PENDING_APPROVAL" && (targetStatus === "PUBLISHED" || targetStatus === "REJECTED")) {
      if (!isAdmin) throw new Error("Only an administrator can approve or reject properties");
    } else if (current === "PUBLISHED" && targetStatus === "ARCHIVED") {
      // Allowed for admin or owner
    } else {
      throw new Error(`Invalid property lifecycle transition from ${current} to ${targetStatus}`);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.property.update({
        where: { id: propertyId },
        data: { lifecycleStatus: targetStatus },
      });

      // Emit Outbox event if published
      if (targetStatus === "PUBLISHED") {
        await tx.outboxEvent.create({
          data: {
            eventType: "PROPERTY_PUBLISHED",
            payload: {
              propertyId: updated.id,
              slug: updated.slug,
              title: updated.title,
              type: updated.type,
              price: updated.price.toString(),
            },
          },
        });
      }

      return updated;
    });
  }

  /**
   * Helper to generate clean unique slug
   */
  static slugify(title: string, city: string = "noida"): string {
    const base = `${title}-${city}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    return `${base}-${Math.random().toString(36).substring(2, 6)}`;
  }
}
