import { prisma } from "@/infrastructure/database/prisma";
import { KycStatus } from "@prisma/client";

export class KycRequiredError extends Error {
  public readonly code = "KYC_REQUIRED";
  public readonly statusCode = 403;

  constructor(
    message: string = "KYC Verification required: Your identity must be verified before proceeding with this action."
  ) {
    super(message);
    this.name = "KycRequiredError";
  }
}

/**
 * Strict server-side compliance gate enforcing verified KYC status.
 * Queries the database directly to prevent trusting outdated client session state.
 *
 * @param userId - Unique identifier of the authenticated user
 * @throws KycRequiredError if the user is not found or kycStatus !== KycStatus.VERIFIED
 */
export async function enforceKycGate(userId: string): Promise<{
  id: string;
  kycStatus: KycStatus;
  roles: string[];
}> {
  if (!userId) {
    throw new KycRequiredError("Authentication required: Missing user identity context.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      kycStatus: true,
      roles: true,
    },
  });

  if (!user) {
    throw new KycRequiredError("User account not found.");
  }

  if (user.kycStatus !== KycStatus.VERIFIED) {
    throw new KycRequiredError(
      `KYC Compliance Gate: User KYC status is '${user.kycStatus}'. Full verification (PAN / Aadhaar) is mandatory for this operation.`
    );
  }

  return {
    id: user.id,
    kycStatus: user.kycStatus,
    roles: user.roles,
  };
}
