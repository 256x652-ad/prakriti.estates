/**
 * IKycProvider - Architecture Policy for Indian IDs (PAN/Aadhaar)
 * 
 * STRICT COMPLIANCE DIRECTIVE:
 * Under no circumstances should raw PAN card alphanumeric strings or Aadhaar 12-digit 
 * numbers be stored in the primary PostgreSQL database.
 * 
 * Flow:
 * 1. The client directly submits the raw ID/Document to the secure third-party provider 
 *    (e.g., DigiLocker, HyperVerge, or UIDAI Authorized AUA) using a short-lived frontend SDK token.
 * 2. The provider returns a secure token/reference ID (`providerRef`) and the verification status.
 * 3. Our backend only stores this `providerRef` in the `KycVerification` table.
 * 4. If PII (like Name, DOB) is returned and needed, it is stored in the `User` table, 
 *    but the raw ID number itself is discarded from memory.
 */

export interface KycInitiationResponse {
  referenceId: string; // Internal tracking ID
  providerUrl?: string; // Redirect URL if the user needs to complete flow externally
  clientToken?: string; // Token for frontend SDK initialization
}

export interface KycVerificationResult {
  isVerified: boolean;
  status: "VERIFIED" | "PENDING" | "MANUAL_REVIEW" | "REJECTED";
  providerRef: string; // The safe tokenized string to store in DB
  failureReason?: string;
  extractedData?: {
    firstName?: string;
    lastName?: string;
    dob?: Date;
    address?: string; // Potentially parseable for property validation
  };
}

export interface IKycProvider {
  /**
   * Initializes a new KYC session with the provider.
   */
  initiateSession(userId: string, documentType: "PAN" | "AADHAAR" | "PASSPORT"): Promise<KycInitiationResponse>;

  /**
   * Verifies the completion status of a KYC session using the provider's reference.
   * Can be called via a Webhook from the provider or polling.
   */
  verifySessionStatus(providerRef: string): Promise<KycVerificationResult>;
}
