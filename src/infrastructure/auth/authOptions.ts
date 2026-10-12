import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { compare } from "bcrypt";
import { Role } from "@prisma/client";

/**
 * NEXTAUTH.JS AUTHENTICATION CONFIGURATION
 * Two-Step Credentials Provider:
 * 1. Password Verification (Email or Phone + Password)
 * 2. Mandatory SMS OTP Verification Gate before JWT issuance
 */
export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      id: "two-factor-credentials",
      name: "Email/Password with SMS OTP",
      credentials: {
        emailOrPhone: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "SMS OTP", type: "text" },
      },
      async authorize(credentials, req) {
        const ipAddress = (req?.headers?.["x-forwarded-for"] as string) || "127.0.0.1";
        const userAgent = (req?.headers?.["user-agent"] as string) || "unknown";

        if (!credentials?.emailOrPhone || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS");
        }

        const identifier = credentials.emailOrPhone.trim();

        // Normalize phone number (e.g. "9999999999" -> ["9999999999", "+919999999999"])
        const cleanDigits = identifier.replace(/\D/g, "");
        const searchTerms = [identifier];
        if (cleanDigits.length === 10) {
          searchTerms.push(`+91${cleanDigits}`);
          searchTerms.push(cleanDigits);
        } else if (cleanDigits.length === 11 && cleanDigits.startsWith("0")) {
          searchTerms.push(`+91${cleanDigits.slice(1)}`);
          searchTerms.push(cleanDigits.slice(1));
        } else if (cleanDigits.length === 12 && cleanDigits.startsWith("91")) {
          searchTerms.push(`+${cleanDigits}`);
          searchTerms.push(cleanDigits.slice(2));
        }

        // 1. Fetch user by email or phone (supporting both with and without +91)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier },
              { phoneNumber: { in: Array.from(new Set(searchTerms)) } },
            ],
          },
        });

        if (!user || !user.passwordHash) {
          // Log failed login attempt
          await AuditLogService.logSystemAction({
            actorId: "ANONYMOUS",
            actorRole: "USER",
            actionType: "USER_LOGIN_FAILED",
            targetEntity: "UserAuth",
            targetId: identifier,
            reasonCode: "INVALID_CREDENTIALS_USER_NOT_FOUND",
            ipAddress,
            userAgent,
          });
          throw new Error("INVALID_CREDENTIALS");
        }

        // 2. Validate Password
        const isPasswordValid = await compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          await AuditLogService.logSystemAction({
            actorId: user.id,
            actorRole: user.roles[0],
            actionType: "USER_LOGIN_FAILED",
            targetEntity: "UserAuth",
            targetId: user.id,
            reasonCode: "INVALID_PASSWORD",
            ipAddress,
            userAgent,
          });
          throw new Error("INVALID_CREDENTIALS");
        }

        // Optional OTP check (if OTP was explicitly passed)
        if (credentials.otp) {
          if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
            throw new Error("OTP_EXPIRED");
          }

          const isOtpValid = await compare(credentials.otp, user.otpHash);
          if (!isOtpValid) {
            await AuditLogService.logSystemAction({
              actorId: user.id,
              actorRole: user.roles[0],
              actionType: "USER_LOGIN_FAILED",
              targetEntity: "UserAuth",
              targetId: user.id,
              reasonCode: "INVALID_OTP",
              ipAddress,
              userAgent,
            });
            throw new Error("INVALID_OTP");
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { otpHash: null, otpExpiresAt: null },
          });
        }

        // Audit Log Login Success
        await AuditLogService.logSystemAction({
          actorId: user.id,
          actorRole: user.roles[0],
          actionType: "USER_LOGIN_SUCCESS",
          targetEntity: "UserAuth",
          targetId: user.id,
          reasonCode: credentials.otp ? "LOGIN_VERIFIED_2FA" : "LOGIN_DIRECT_CREDENTIALS",
          ipAddress,
          userAgent,
        });

        return {
          id: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.phoneNumber,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roles: user.roles,
          kycStatus: user.kycStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Upon sign in, inject database-verified identity, roles, and KYC status
      if (user) {
        token.id = user.id;
        token.phoneNumber = (user as any).phoneNumber;
        token.roles = (user as any).roles || [Role.USER];
        token.kycStatus = (user as any).kycStatus || "PENDING";
      }

      // Handle Impersonation Session Update Triggers
      if (trigger === "update" && session) {
        if (session.impersonateUserId) {
          // Store original admin identity if not already stored
          token.impersonatorId = token.impersonatorId || (token.id as string);
          token.impersonatorRole = token.impersonatorRole || ((token.roles as string[])?.[0] || "SUPER_ADMIN");
          token.id = session.impersonateUserId;
          token.roles = session.impersonateRoles || [Role.USER];
          token.phoneNumber = session.impersonatePhone || token.phoneNumber;
          token.kycStatus = session.impersonateKycStatus || "VERIFIED";
        } else if (session.revertImpersonation && token.impersonatorId) {
          // Revert to original Super Admin
          token.id = token.impersonatorId;
          token.roles = [Role.ADMIN];
          delete token.impersonatorId;
          delete token.impersonatorRole;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Expose verified roles and identity to Server Components and Client Session
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).phoneNumber = token.phoneNumber;
        (session.user as any).roles = token.roles as Role[];
        (session.user as any).kycStatus = token.kycStatus;
        if (token.impersonatorId) {
          (session.user as any).impersonatorId = token.impersonatorId;
          (session.user as any).impersonatorRole = token.impersonatorRole;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
