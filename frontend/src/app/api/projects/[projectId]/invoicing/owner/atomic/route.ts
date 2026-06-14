import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";
import type { Json } from "@/types/database.types";

/**
 * POST /api/projects/[projectId]/invoicing/owner/atomic
 *
 * Creates an owner invoice — payment application + invoice header + all line
 * items — in a SINGLE database transaction via the create_owner_invoice_atomic
 * RPC. Either every row is written or none are; a failure on any step leaves no
 * orphaned payment application or header invoice behind. This replaces the old
 * three-call sequence in the New Invoice page, which could leave partial data.
 */

// Map the PL/pgSQL SQLSTATE raised by the RPC to an HTTP status.
function statusForPgCode(code: string | undefined): number {
  switch (code) {
    case "23505": // unique_violation -> duplicate application number
      return 409;
    case "23514": // check_violation -> contract not approved
      return 422;
    case "02000": // no_data_found -> contract not found for project
    case "P0002": // no_data_found (NO_DATA_FOUND)
      return 404;
    case "22P02": // invalid_text_representation -> bad numeric / uuid / date
    case "22007":
    case "22008":
      return 400;
    default:
      return 400;
  }
}

interface AtomicInvoicePayload {
  prime_contract_id?: string;
  payment_application?: { application_number?: string } & Record<string, Json>;
  invoice?: Record<string, Json>;
  line_items?: Json[];
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/invoicing/owner/atomic#POST",
  async ({ request, params }) => {
    const where = "projects/[projectId]/invoicing/owner/atomic#POST";
    const { projectId } = params;
    const projectIdNum = parseInt(projectId, 10);

    if (!Number.isFinite(projectIdNum)) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where,
        message: `Invalid project id '${projectId}'.`,
      });
    }

    const guard = await requirePermission(projectIdNum, "contracts", "write");
    if (guard.denied) return guard.response;

    const body = (await request.json()) as AtomicInvoicePayload;

    if (!body.prime_contract_id) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where,
        message: "prime_contract_id is required.",
        details: [
          { path: "prime_contract_id", message: "Prime contract is required." },
        ],
      });
    }

    if (!body.payment_application?.application_number) {
      throw new GuardrailError({
        code: "INVALID_PAYLOAD",
        where,
        message: "An application/invoice number is required.",
      });
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("create_owner_invoice_atomic", {
      p_project_id: projectIdNum,
      p_contract_id: body.prime_contract_id,
      p_payment_application: body.payment_application ?? {},
      p_invoice: body.invoice ?? {},
      p_line_items: body.line_items ?? [],
    });

    if (error) {
      const status = statusForPgCode(error.code);
      const message =
        error.message?.trim() ||
        "Failed to create the invoice. No changes were saved.";
      // The whole transaction rolled back — nothing partial was written.
      return NextResponse.json(
        { error: message, error_message: message },
        { status },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  },
);
