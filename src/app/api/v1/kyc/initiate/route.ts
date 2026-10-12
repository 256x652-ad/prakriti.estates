import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { kycService } from "@/modules/kyc/services/KycService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const InitiateKycSchema = z.object({
  documentType: z.enum(["PAN", "AADHAAR", "PASSPORT", "VOTER_ID"]),
  documentNumberToken: z.string().min(5, "Document identifier or token is required"),
  nameAsPerDocument: z.string().min(2, "Name as per official document is required"),
  dateOfBirth: z.string().optional(),
  documentMediaUrl: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to initiate KYC", 401);
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const validation = InitiateKycSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid KYC submission details",
        422,
        validation.error.flatten()
      );
    }

    const result = await kycService.initiateKyc({
      userId,
      ...validation.data,
    });

    return ApiResponseHelper.success(result, undefined, 201);
  } catch (error: any) {
    console.error("[KYC Initiate Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to process KYC verification request",
      500
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userId = (session.user as any).id;
    const kycData = await kycService.getUserKycStatus(userId);

    return ApiResponseHelper.success(kycData);
  } catch (error: any) {
    console.error("[KYC Status Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to fetch KYC status",
      500
    );
  }
}
