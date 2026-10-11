import { prisma } from "@/infrastructure/database/prisma";

export class TrustScoreService {
  /**
   * Calculates the trust score for a property based on its audits.
   * If the property passes the required threshold, it automatically
   * earns the "Prakriti Certified" (Gold Pin) status.
   */
  async calculatePropertyTrustScore(propertyId: string): Promise<{ score: number, isCertified: boolean }> {
    // 1. Fetch all VALID audits for this property
    const activeAudits = await prisma.propertyAudit.findMany({
      where: {
        propertyId,
        OR: [
          { expiresAt: { gt: new Date() } },
          { expiresAt: null }
        ]
      }
    });

    if (activeAudits.length === 0) {
      // No audits = 0 score, definitely not certified
      await this.updateCertificationCache(propertyId, false);
      return { score: 0, isCertified: false };
    }

    // 2. Calculate the weighted or average score
    // In a real scenario, STRUCTURAL might have a higher weight than VASTU.
    // Here we use a simple average for demonstration.
    const totalScore = activeAudits.reduce((acc, audit) => acc + audit.score, 0);
    const averageScore = Math.round(totalScore / activeAudits.length);

    // 3. Determine Certification Rules
    // e.g. Must have at least 1 LEGAL audit and 1 STRUCTURAL audit with a high average
    const hasLegal = activeAudits.some(a => a.type === "LEGAL");
    const hasStructural = activeAudits.some(a => a.type === "STRUCTURAL");
    
    const isCertified = hasLegal && hasStructural && averageScore >= 85;

    // 4. Update the Property's cache boolean so the Map search doesn't have to join audits on the fly
    await this.updateCertificationCache(propertyId, isCertified);

    return {
      score: averageScore,
      isCertified
    };
  }

  private async updateCertificationCache(propertyId: string, isCertified: boolean) {
    await prisma.property.update({
      where: { id: propertyId },
      data: { isPrakritiCertified: isCertified }
    });
  }
}
