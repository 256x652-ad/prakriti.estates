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
      name: "Credentials",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP (Activation)", type: "text" } // If OTP is required
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber) throw new Error("Phone number is required");

        const user = await prisma.user.findUnique({
          where: { phoneNumber: credentials.phoneNumber }
        });

        if (!user) {
          throw new Error("No user found with this phone number");
        }

        // Logic for handling OTP verification during account activation
        if (user.kycStatus === "PENDING" && credentials.otp) {
          if (user.otpHash && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
            const isOtpValid = await compare(credentials.otp, user.otpHash);
            if (!isOtpValid) throw new Error("Invalid OTP");
            
            // Mark user as active (or verified)
            await prisma.user.update({
              where: { id: user.id },
              data: { kycStatus: "VERIFIED", otpHash: null, otpExpiresAt: null }
            });
            user.kycStatus = "VERIFIED";
          } else {
             throw new Error("OTP expired or invalid");
          }
        } else if (user.kycStatus === "PENDING") {
          throw new Error("Account not activated. Please verify OTP.");
        }

        // For standard password check (if we added a password hash to the model)
        // const isPasswordValid = await compare(credentials.password, user.passwordHash!);
        // if (!isPasswordValid) throw new Error("Invalid password");

        return {
          id: user.id,
          phoneNumber: user.phoneNumber,
          roles: user.roles,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Upon sign in, attach role and id to JWT
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // Make token info available in the session object
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role as Role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin', // Custom signin page
  },
  secret: process.env.NEXTAUTH_SECRET,
};
