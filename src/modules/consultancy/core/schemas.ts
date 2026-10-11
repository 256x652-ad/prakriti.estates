import { z } from "zod";

// =================================================================
// API Contract for generating a Consultancy Request
// Route: POST /api/consultancy/requests
// =================================================================

export const CreateConsultancyRequestSchema = z.object({
  propertyId: z.string().uuid("Invalid Property ID"),
  serviceType: z.enum(["AUDIT", "VASTU_REPORT", "STRUCTURAL_ENGINEERING"]),
  urgency: z.enum(["NORMAL", "HIGH", "CRITICAL"]).default("NORMAL"),
  notes: z.string().max(1000).optional(),
});

export type CreateConsultancyRequestDTO = z.infer<typeof CreateConsultancyRequestSchema>;

export const ConsultancyResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  serviceType: z.string(),
  assignedConsultantId: z.string().uuid().nullable(),
  estimatedCompletion: z.string().datetime().nullable(),
});

export type ConsultancyResponseDTO = z.infer<typeof ConsultancyResponseSchema>;
