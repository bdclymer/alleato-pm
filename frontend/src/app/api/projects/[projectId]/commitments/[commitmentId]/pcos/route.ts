import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentId: string }>;
}

const VALID_STATUSES = ["open", "pending", "approved", "rejected", "void"] as const;
type PcoStatus = (typeof VALID_STATUSES)[number];

interface PcoCreateBody {
  number: string;
  title: string;
  amount?: number;
  description?: string;
  change_reason?: string;
  status?: PcoStatus;
}

// GET — list all PCOs for a commitment
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase } = authResult;

    const { data, error } = await supabase
      .from("commitment_pcos")
      .select("*")
      .eq("commitment_id", commitmentId)
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// POST — create a new PCO
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase } = authResult;

    const body = (await request.json()) as PcoCreateBody;

    if (!body.number?.trim()) {
      return NextResponse.json({ error: "PCO number is required." }, { status: 400 });
    }
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "PCO title is required." }, { status: 400 });
    }
    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    // Retrieve current user id for created_by
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("commitment_pcos")
      .insert({
        project_id: numericProjectId,
        commitment_id: commitmentId,
        number: body.number.trim(),
        title: body.title.trim(),
        amount: body.amount ?? 0,
        description: body.description ?? null,
        change_reason: body.change_reason ?? null,
        status: body.status ?? "open",
        created_by: user?.id ?? null,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
