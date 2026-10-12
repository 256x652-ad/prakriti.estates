import { prisma } from "@/infrastructure/database/prisma";
import { KycStatus } from "@prisma/client";
import {
  IKycProvider,
  InitiateKycRequest,
  KycWebhookPayload,
  KycVerificationResultStatus,
} from "../core/IKycProvider";
import { mockIndianKycProvider } from "../adapters/MockIndianKycProvider";

export class KycService {
  private provider: IKycProvider;

  constructor(provider: IKycProvider = mockIndianKycProvider) {
    this.provider = provider;
  }

  /**
   * Helper to map provider status to Prisma KycStatus enum
   */
  private mapStatusToPrisma(status: KycVerificationResultStatus): KycStatus {
    switch (status) {
      case "VERIFIED":
        return KycStatus.VERIFIED;
      case "MANUAL_REVIEW":
        return KycStatus.MANUAL_REVIEW;
      case "FAILED":
        return KycStatus.REJECTED;
      case "PENDING":
      default:
        return KycStatus.PENDING;
    }
  }

  /**
   * Initiates a new KYC verification cycle for a user.
   * Ensures raw sensitive document numbers are never stored in the database.
   */
  async initiateKyc(request: InitiateKycRequest) {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { id: true, kycStatus: true, roles: true },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    if (user.kycStatus === KycStatus.VERIFIED) {
      return {
        status: KycStatus.VERIFIED,
        message: "User KYC is already verified",
        providerRef: null,
      };
    }

    // Call Provider Adapter
    const providerResponse = await this.provider.initiateVerification(request);
    const mappedStatus = this.mapStatusToPrisma(providerResponse.status);

    // Persist KycVerification Record and synchronize User status in transaction
    const verificationRecord = await prisma.$transaction(async (tx) => {
      const record = await tx.kycVerification.create({
        data: {
          userId: request.userId,
          provider: providerResponse.provider,
          providerRef: providerResponse.referenceId,
          status: mappedStatus,
          documentType: request.documentType,
          failureReason: mappedStatus === KycStatus.REJECTED ? providerResponse.message : null,
        },
      });

      await tx.user.update({
        where: { id: request.userId },
        data: {
          kycStatus: mappedStatus,
        },
      });

      return record;
    });

    return {
      id: verificationRecord.id,
      providerRef: verificationRecord.providerRef,
      status: verificationRecord.status,
      message: providerResponse.message,
    };
  }

  /**
   * Processes asynchronous Webhook callbacks from KYC verification providers.
   */
  async processWebhook(payload: KycWebhookPayload) {
    const providerStatus = await this.provider.handleWebhook(payload);
    const mappedStatus = this.mapStatusToPrisma(providerStatus.status);

    const verificationRecord = await prisma.kycVerification.findUnique({
      where: { providerRef: payload.referenceId },
    });

    if (!verificationRecord) {
      throw new Error(`KYC_RECORD_NOT_FOUND: No verification matches reference ${payload.referenceId}`);
    }

    // Update Verification and User statuses
    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.kycVerification.update({
        where: { id: verificationRecord.id },
        data: {
          status: mappedStatus,
          failureReason: providerStatus.failureReason || null,
        },
      });

      await tx.user.update({
        where: { id: verificationRecord.userId },
        data: {
          kycStatus: mappedStatus,
        },
      });

      return rec;
    });

    return updated;
  }

  /**
   * Retrieves current KYC verification status and history for a given user.
   */
  async getUserKycStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        kycStatus: true,
        firstName: true,
        lastName: true,
        kycVerifications: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return {
      userId: user.id,
      overallStatus: user.kycStatus,
      isVerified: user.kycStatus === KycStatus.VERIFIED,
      recentVerifications: user.kycVerifications,
    };
  }
}

export const kycService = new KycService();
