export type KycDocumentType = "PAN" | "AADHAAR" | "PASSPORT" | "VOTER_ID";

export type KycVerificationResultStatus = "VERIFIED" | "FAILED" | "MANUAL_REVIEW" | "PENDING";

export interface InitiateKycRequest {
  userId: string;
  documentType: KycDocumentType;
  /**
   * Encrypted, masked or tokenized document identifier (e.g., PAN: ABCDE1234F, Aadhaar Virtual ID or token).
   * Plaintext Aadhaar numbers are never stored in the database.
   */
  documentNumberToken: string;
  nameAsPerDocument: string;
  dateOfBirth?: string; // YYYY-MM-DD
  documentMediaUrl?: string; // Secure S3 URL
}

export interface InitiateKycResponse {
  referenceId: string;
  status: KycVerificationResultStatus;
  provider: string;
  message?: string;
  redirectUrl?: string;
}

export interface KycStatusResponse {
  referenceId: string;
  status: KycVerificationResultStatus;
  failureReason?: string;
  verifiedAt?: Date;
  rawResponse?: Record<string, any>;
}

export interface KycWebhookPayload {
  event: "kyc.completed" | "kyc.failed" | "kyc.manual_review";
  referenceId: string;
  status: KycVerificationResultStatus;
  failureReason?: string;
  signature?: string;
  timestamp: string;
  data?: Record<string, any>;
}

export interface IKycProvider {
  /**
   * Name/Identifier of the verification provider (e.g., 'SUREPASS', 'HYPERVERGE', 'MOCK_INDIAN_KYC')
   */
  readonly providerName: string;

  /**
   * Initiates verification flow with the external provider.
   */
  initiateVerification(userData: InitiateKycRequest): Promise<InitiateKycResponse>;

  /**
   * Polling/Manual status retrieval using the provider reference ID.
   */
  checkStatus(referenceId: string): Promise<KycStatusResponse>;

  /**
   * Verifies and maps incoming webhook event payload from provider.
   */
  handleWebhook(payload: KycWebhookPayload): Promise<KycStatusResponse>;
}
