import { z } from "zod";

export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, "Please provide a valid mobile number with country code (e.g. +919876543210)");

export const EmailSchema = z
  .string()
  .trim()
  .email("Please provide a valid email address");

export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const OtpSchema = z
  .string()
  .trim()
  .length(6, "Verification code must be exactly 6 digits")
  .regex(/^\d{6}$/, "Code must contain digits only");

/**
 * Client-Side Registration Schema (React Hook Form)
 */
export const RegisterFormSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
  email: EmailSchema,
  phoneNumber: PhoneSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
  role: z.enum(["BUYER", "SELLER", "CONSULTANT", "USER"]),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

/**
 * Client-Side Two-Step Login Schema: Step 1 (Credentials)
 */
export const LoginFormSchema = z.object({
  emailOrPhone: z.string().trim().min(3, "Please enter your email or registered phone number"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;

/**
 * Client-Side Two-Step Login Schema: Step 2 (SMS OTP Verification)
 */
export const OtpVerificationSchema = z.object({
  phoneNumber: PhoneSchema.optional(),
  otp: OtpSchema,
});

export const VerifyOtpSchema = z.object({
  phoneNumber: PhoneSchema,
  otp: OtpSchema,
});

export type OtpVerificationValues = z.infer<typeof OtpVerificationSchema>;
