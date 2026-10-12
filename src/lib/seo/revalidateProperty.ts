import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand cache invalidator for Property Listings.
 * Triggered upon:
 *  - Property publishing or updates
 *  - Token lock creation or expiry
 *  - Price changes or Certification approvals
 */
export async function revalidatePropertyListing(slugOrId: string) {
  try {
    // Invalidate the specific property page ISR cache
    revalidatePath(`/property/${slugOrId}`);
    
    // Invalidate discovery feeds & sitemaps
    revalidatePath("/search");
    revalidatePath("/");
    revalidatePath("/sitemap.xml");

    // Next.js 15 cache tag invalidation
    revalidateTag(`property-${slugOrId}`, { expire: 0 });
    revalidateTag("properties-list", { expire: 0 });
  } catch (error) {
    console.error(`Failed to revalidate property cache for ${slugOrId}:`, error);
  }
}
