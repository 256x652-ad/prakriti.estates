import { z } from "zod";

export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, "Phone number must be a valid format with country code (e.g. +919876543210)");

export const OtpSchema = z
  .string()
  .trim()
  .length(6, "OTP must be exactly 6 digits")
  .regex(/^\d{6}$/, "OTP must contain digits only");

export const RegisterSchema = z.object({
  phoneNumber: PhoneSchema,
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  role: z.enum(["BUYER", "SELLER", "USER", "CONSULTANT"]).default("BUYER"),
});

export const SendOtpSchema = z.object({
  phoneNumber: PhoneSchema,
  purpose: z.enum(["LOGIN", "REGISTER", "PASSWORD_RESET"]).default("LOGIN"),
});

export const VerifyOtpSchema = z.object({
  phoneNumber: PhoneSchema,
  otp: OtpSchema,
});
