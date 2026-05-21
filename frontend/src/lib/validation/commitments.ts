import { z } from "zod";

export const commitmentListItemSchema = z
  .object({
    id: z.string(),
    project_id: z.number(),
    number: z.string(),
    title: z.string().nullable(),
    type: z.string(),
    status: z.string(),
    executed: z.boolean(),
    original_amount: z.number(),
    revised_contract_amount: z.number(),
    billed_to_date: z.number(),
    balance_to_finish: z.number(),
    contract_company_id: z.string().nullable(),
    contract_company: z
      .object({
        id: z.string(),
        name: z.string(),
        type: z.string().optional(),
      })
      .nullable(),
    description: z.string().nullable(),
    start_date: z.string().nullable(),
    executed_date: z.string().nullable(),
    retention_percentage: z.number().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    erp_status: z.string().nullable(),
    ssov_status: z.string().nullable(),
    approved_change_orders: z.number(),
    pending_change_orders: z.number(),
    draft_change_orders: z.number(),
    invoiced_amount: z.number(),
    payments_issued: z.number(),
    percent_paid: z.number(),
    remaining_balance: z.number(),
    trade_names: z.array(z.string()),
    scope_summary: z.string().nullable(),
    is_private: z.boolean(),
  })
  .passthrough();

export const commitmentListResponseSchema = z.object({
  data: z.array(commitmentListItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type CommitmentListItem = z.infer<typeof commitmentListItemSchema>;
export type CommitmentListResponse = z.infer<typeof commitmentListResponseSchema>;
