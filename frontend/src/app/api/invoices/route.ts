import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { z } from "zod";

// Zod schema for invoice creation
// OWASP: Input validation on financial data endpoints (A03:2021 - Injection, A04:2021 - Insecure Design)
const createInvoiceSchema = z.object({
  invoice_number: z
    .string()
    .trim()
    .min(1, "Invoice number is required")
    .max(100, "Invoice number must be at most 100 characters"),
  commitment_id: z.string().uuid("Must be a valid UUID").nullable().optional(),
  contract_id: z.string().uuid("Must be a valid UUID").nullable().optional(),
  project_id: z.coerce.number().int().positive().nullable().optional(),
  billing_period_start: z
    .string()
    .min(1, "Billing period start is required")
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      "Must be a valid date string",
    ),
  billing_period_end: z
    .string()
    .min(1, "Billing period end is required")
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      "Must be a valid date string",
    ),
  invoice_date: z
    .string()
    .min(1, "Invoice date is required")
    .refine(
      (val) => !Number.isNaN(Date.parse(val)),
      "Must be a valid date string",
    ),
  due_date: z
    .string()
    .refine(
      (val) => !val || !Number.isNaN(Date.parse(val)),
      "Must be a valid date string",
    )
    .optional()
    .nullable(),
  status: z
    .enum(["draft", "submitted", "approved", "paid", "void"])
    .default("draft"),
  amount: z.coerce.number().default(0),
  retention_amount: z.coerce.number().default(0),
  net_amount: z.coerce.number().default(0),
  notes: z.string().trim().max(2000, "Notes must be at most 2000 characters").optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const projectId = searchParams.get("project_id");
    const commitmentId = searchParams.get("commitment_id");

    let query = supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,notes.ilike.%${search}%`,
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (projectId) {
      query = query.eq("project_id", parseInt(projectId));
    }

    if (commitmentId) {
      query = query.eq("commitment_id", commitmentId);
    }

    const { data, error } = await query;

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = createInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const validated = validation.data;

    const { data, error } = await supabase
      .from("invoices")
      .insert({
        invoice_number: validated.invoice_number,
        commitment_id: validated.commitment_id || null,
        contract_id: validated.contract_id || null,
        project_id: validated.project_id || null,
        billing_period_start: validated.billing_period_start,
        billing_period_end: validated.billing_period_end,
        invoice_date: validated.invoice_date,
        due_date: validated.due_date,
        status: validated.status,
        amount: validated.amount,
        retention_amount: validated.retention_amount,
        net_amount: validated.net_amount,
        notes: validated.notes,
      })
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
