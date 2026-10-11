import crypto from "crypto";
import {
  IKycProvider,
  InitiateKycRequest,
  InitiateKycResponse,
  KycStatusResponse,
  KycWebhookPayload,
  KycVerificationResultStatus,
} from "../core/IKycProvider";

/**
 * Functional Mock Indian KYC Provider simulating integrations with authorized
 * verification services (e.g. NSDL for PAN, UIDAI DigiLocker/Aadhaar OTP).
 * Enforces masking and returns deterministic statuses for development/testing.
 */
export class MockIndianKycProvider implements IKycProvider {
  readonly providerName = "MOCK_INDIAN_KYC";

  // In-memory registry for mock provider status persistence
  private static store: Map<
    string,
    {
      status: KycVerificationResultStatus;
      documentType: string;
      userId: string;
      failureReason?: string;
    }
  > = new Map();

  async initiateVerification(userData: InitiateKycRequest): Promise<InitiateKycResponse> {
    const referenceId = `KREF_${userData.documentType}_${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    const rawToken = userData.documentNumberToken.trim().toUpperCase();

    // Deterministic simulation rules:
    // 1. PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
    // 2. Failure trigger: If token contains 'FAIL' -> simulates REJECTED
    // 3. Review trigger: If token contains 'REV' -> simulates MANUAL_REVIEW
    // 4. Default: Auto-verified for seamless local developer testing

    let status: KycVerificationResultStatus = "PENDING";
    let failureReason: string | undefined;

    if (rawToken.includes("FAIL")) {
      status = "FAILED";
      failureReason = "Name mismatch with NSDL / Government Tax Database records";
    } else if (rawToken.includes("REV")) {
      status = "MANUAL_REVIEW";
      failureReason = "Low OCR image resolution; forwarded to Compliance Officer";
    } else if (userData.documentType === "PAN") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(rawToken)) {
        status = "FAILED";
        failureReason = "Invalid PAN structural format (Must match [A-Z]{5}[0-9]{4}[A-Z]{1})";
      } else {
        status = "VERIFIED";
      }
    } else {
      status = "VERIFIED";
    }

    MockIndianKycProvider.store.set(referenceId, {
      status,
      documentType: userData.documentType,
      userId: userData.userId,
      failureReason,
    });

    return {
      referenceId,
      status,
      provider: this.providerName,
      message:
        status === "VERIFIED"
          ? "Government identity records successfully verified"
          : status === "MANUAL_REVIEW"
          ? "Submitted for manual compliance review"
          : status === "FAILED"
          ? failureReason
          : "Verification pending provider webhook",
    };
  }

  async checkStatus(referenceId: string): Promise<KycStatusResponse> {
    const record = MockIndianKycProvider.store.get(referenceId);
    if (!record) {
      return {
        referenceId,
        status: "FAILED",
        failureReason: "Reference ID not found with provider",
      };
    }

    return {
      referenceId,
      status: record.status,
      failureReason: record.failureReason,
      verifiedAt: record.status === "VERIFIED" ? new Date() : undefined,
    };
  }

  async handleWebhook(payload: KycWebhookPayload): Promise<KycStatusResponse> {
    const existing = MockIndianKycProvider.store.get(payload.referenceId);
    if (existing) {
      existing.status = payload.status;
      existing.failureReason = payload.failureReason;
      MockIndianKycProvider.store.set(payload.referenceId, existing);
    }

    return {
      referenceId: payload.referenceId,
      status: payload.status,
      failureReason: payload.failureReason,
      verifiedAt: payload.status === "VERIFIED" ? new Date() : undefined,
    };
  }
}

export const mockIndianKycProvider = new MockIndianKycProvider();
