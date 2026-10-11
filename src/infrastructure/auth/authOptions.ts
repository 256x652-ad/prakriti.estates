import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/infrastructure/database/prisma";
import { compare } from "bcrypt";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      id: "sms-otp",
      name: "SMS OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        otp: { label: "One-Time Password", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber) {
          throw new Error("Phone number is required");
        }
        if (!credentials?.otp) {
          throw new Error("One-time password (OTP) is required");
        }

        const user = await prisma.user.findUnique({
          where: { phoneNumber: credentials.phoneNumber },
        });

        if (!user) {
          throw new Error("No user registered with this phone number.");
        }

        // Verify OTP against hashed OTP on user record
        if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
          throw new Error("OTP has expired. Please request a new verification code.");
        }

        const isOtpValid = await compare(credentials.otp, user.otpHash);
        if (!isOtpValid) {
          throw new Error("Invalid verification code. Please try again.");
        }

        // Clear one-time hash upon successful authentication
        await prisma.user.update({
          where: { id: user.id },
          data: { otpHash: null, otpExpiresAt: null },
        });

        return {
          id: user.id,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.phoneNumber,
          phoneNumber: user.phoneNumber,
          roles: user.roles,
          kycStatus: user.kycStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phoneNumber = (user as any).phoneNumber;
        token.roles = (user as any).roles || ["USER"];
        token.kycStatus = (user as any).kycStatus || "PENDING";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).phoneNumber = token.phoneNumber;
        (session.user as any).roles = token.roles as Role[];
        (session.user as any).kycStatus = token.kycStatus;
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
