import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GuardrailError } from "@/lib/guardrails/errors";
import { validateResponseContract, withApiGuardrails } from "@/lib/guardrails/api";

/**
 * GET /api/employees
 * Returns people with person_type = 'employee' or 'user' and status = 'active'.
 * Used by the Command Center assignee dropdown.
 */
const EmployeeSchema = z.object({
  id: z.string(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  job_title: z.string().nullable().optional(),
  person_type: z.string().nullable().optional(),
});

export const GET = withApiGuardrails("/api/employees#GET", async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/employees#GET",
      message: "Unauthorized employee list request.",
      status: 401,
      severity: "medium",
    });
  }

  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, email, job_title, person_type")
    .in("person_type", ["employee", "user"])
    .eq("status", "active")
    .order("first_name", { ascending: true });

  if (error) {
    throw new GuardrailError({
      code: "INTERNAL_ERROR",
      where: "/api/employees#GET",
      message: "Failed to fetch employees.",
      details: { reason: error.message },
      cause: error,
    });
  }

  validateResponseContract(
    z.array(EmployeeSchema),
    data ?? [],
    "/api/employees#GET",
  );

  return NextResponse.json(data);
});
