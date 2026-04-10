import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentId: string; pcoId: string }>;
}

const VALID_STATUSES = ["open", "pending", "approved", "rejected", "void"] as const;
type PcoStatus = (typeof VALID_STATUSES)[number];

interface PcoUpdateBody {
  title?: string;
  amount?: number;
  description?: string;
  change_reason?: string;
  status?: PcoStatus;
}

// GET — single PCO
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId, pcoId } = await params;
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
      .eq("id", pcoId)
      .eq("commitment_id", commitmentId)
      .eq("project_id", numericProjectId)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "PCO not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// PUT — update PCO
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId, pcoId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase } = authResult;

    const body = (await request.json()) as PcoUpdateBody;

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updatePayload.title = body.title.trim();
    if (body.amount !== undefined) updatePayload.amount = body.amount;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.change_reason !== undefined) updatePayload.change_reason = body.change_reason;
    if (body.status !== undefined) updatePayload.status = body.status;

    const { data, error } = await supabase
      .from("commitment_pcos")
      .update(updatePayload)
      .eq("id", pcoId)
      .eq("commitment_id", commitmentId)
      .eq("project_id", numericProjectId)
      .select("*")
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "PCO not found." }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// DELETE — delete PCO
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId, pcoId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase } = authResult;

    const { error } = await supabase
      .from("commitment_pcos")
      .delete()
      .eq("id", pcoId)
      .eq("commitment_id", commitmentId)
      .eq("project_id", numericProjectId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
