import { NextRequest } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { RegisterFormSchema } from "@/modules/auth/schemas/authSchemas";
import { ApiResponseHelper } from "@/lib/api/response";
import { RateLimiter } from "@/lib/security/rateLimiter";
import { hash } from "bcrypt";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = RateLimiter.getClientIdentifier(req);

    // Rate limit registration requests per IP
    const rateCheck = await RateLimiter.check(`reg:${ipAddress}`, "AUTH");
    if (!rateCheck.success) {
      return ApiResponseHelper.error(
        "RATE_LIMIT_EXCEEDED",
        `Too many registration attempts. Please wait ${rateCheck.resetSeconds}s.`,
        429
      );
    }

    const body = await req.json();
    const validation = RegisterFormSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid registration details",
        422,
        validation.error.flatten()
      );
    }

    const { phoneNumber, email, firstName, lastName, password, role } = validation.data;

    // Check unique email and phone
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { email },
        ],
      },
    });

    if (existing) {
      return ApiResponseHelper.error(
        "REGISTRATION_FAILED",
        "An account with this mobile number or email already exists.",
        409
      );
    }

    const passwordHash = await hash(password, 10);
    const assignedRole: Role = (Role as any)[role] || Role.BUYER;

    const user = await prisma.user.create({
      data: {
        phoneNumber,
        email,
        firstName,
        lastName,
        passwordHash,
        roles: [assignedRole],
        kycStatus: "PENDING",
      },
      select: {
        id: true,
        phoneNumber: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: true,
        kycStatus: true,
        createdAt: true,
      },
    });

    return ApiResponseHelper.success(
      {
        message: "Account created successfully. Please sign in with your credentials.",
        user,
      },
      undefined,
      201
    );
  } catch (error: any) {
    console.error("[Register Error]", error);
    return ApiResponseHelper.error(
      "REGISTRATION_FAILED",
      error.message || "Failed to complete registration",
      400
    );
  }
}
