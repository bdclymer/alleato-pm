import { z } from "zod";

/**
 * Validation schemas for Prime Contracts API endpoints
 */

export const contractStatusSchema = z.enum([
  "draft",
  "out_for_bid",
  "out_for_signature",
  "approved",
  "complete",
  "terminated",
]);

export const createContractSchema = z.object({
  project_id: z.number().int().positive(),
  contract_number: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  client_id: z.number().int().positive().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  contractor_id: z.string().optional().nullable(), // Can be string ID or null
  architect_engineer_id: z.string().optional().nullable(), // Can be string ID or null
  contract_company_id: z.string().optional().nullable(), // Can be string ID or null
  description: z.string().max(5000).optional().nullable(),
  status: contractStatusSchema.optional().default("draft"),
  executed: z.boolean().optional().default(false),
  executed_at: z.string().datetime().optional().nullable(),
  original_contract_value: z.number().min(0).default(0),
  revised_contract_value: z.number().min(0).optional(),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  substantial_completion_date: z.string().datetime().optional().nullable(),
  actual_completion_date: z.string().datetime().optional().nullable(),
  signed_contract_received_date: z.string().datetime().optional().nullable(),
  contract_termination_date: z.string().datetime().optional().nullable(),
  retention_percentage: z.number().min(0).max(100).optional().default(0),
  payment_terms: z.string().max(1000).optional().nullable(),
  billing_schedule: z.string().max(1000).optional().nullable(),
  is_private: z.boolean().optional().default(false),
  inclusions: z.string().max(5000).optional().nullable(),
  exclusions: z.string().max(5000).optional().nullable(),
});

export const updateContractSchema = z.object({
  contract_number: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(500).optional(),
  client_id: z.number().int().positive().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  contractor_id: z.string().uuid().optional().nullable(),
  architect_engineer_id: z.string().uuid().optional().nullable(),
  contract_company_id: z.string().uuid().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  status: contractStatusSchema.optional(),
  executed: z.boolean().optional(),
  executed_at: z.string().datetime().optional().nullable(),
  original_contract_value: z.number().min(0).optional(),
  revised_contract_value: z.number().min(0).optional(),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
  substantial_completion_date: z.string().datetime().optional().nullable(),
  actual_completion_date: z.string().datetime().optional().nullable(),
  signed_contract_received_date: z.string().datetime().optional().nullable(),
  contract_termination_date: z.string().datetime().optional().nullable(),
  retention_percentage: z.number().min(0).max(100).optional(),
  payment_terms: z.string().max(1000).optional().nullable(),
  billing_schedule: z.string().max(1000).optional().nullable(),
  is_private: z.boolean().optional(),
  inclusions: z.string().max(5000).optional().nullable(),
  exclusions: z.string().max(5000).optional().nullable(),
});

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
