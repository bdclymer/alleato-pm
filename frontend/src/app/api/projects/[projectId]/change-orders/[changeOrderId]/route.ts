import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { changeOrderSchema } from "@/lib/schemas/financial-schemas";
import type { ZodError } from "@/app/api/types";
import { apiErrorResponse } from "@/lib/api-error";
import type { Database } from "@/types/database.types";

type ChangeOrderUpdate = Database["public"]["Tables"]["change_orders"]["Update"];

type RouteParams = {
  params: Promise<{ projectId: string; changeOrderId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
    const supabase = await createClient();

    // Fetch change order with full relations
    const { data, error } = await supabase
      .from("change_orders")
      .select(
        `
        *,
        contracts:contract_id (
          id,
          contract_number,
          contract_name,
          contract_type
        ),
        change_events:change_event_id (
          id,
          title,
          status
        )
      `
      )
      .eq("project_id", Number(projectId))
      .eq("id", Number(changeOrderId))
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Change order not found" },
          { status: 404 },
        );
      }
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const validatedData = changeOrderSchema.partial().parse(body);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from("change_orders")
      .select("id, status")
      .eq("project_id", Number(projectId))
      .eq("id", Number(changeOrderId))
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    const updateData: ChangeOrderUpdate = {
      ...validatedData,
      updated_at: new Date().toISOString(),
    };

    if (
      validatedData.status === "approved" &&
      existing.status !== "approved"
    ) {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;
    }

    if (
      validatedData.status === "pending" &&
      existing.status === "draft"
    ) {
      updateData.submitted_at = new Date().toISOString();
      updateData.submitted_by = user.id;
    }

    const { data, error } = await supabase
      .from("change_orders")
      .update(updateData)
      .eq("project_id", Number(projectId))
      .eq("id", Number(changeOrderId))
      .select()
      .single();

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as ZodError;
      return NextResponse.json(
        { error: "Validation error", issues: zodError.errors },
        { status: 400 },
      );
    }

    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { projectId, changeOrderId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: changeOrder, error: fetchError } = await supabase
      .from("change_orders")
      .select("id, status")
      .eq("project_id", Number(projectId))
      .eq("id", Number(changeOrderId))
      .single();

    if (fetchError || !changeOrder) {
      return NextResponse.json(
        { error: "Change order not found" },
        { status: 404 },
      );
    }

    if (changeOrder.status === "approved") {
      return NextResponse.json(
        {
          error: "Cannot delete approved change orders. Consider voiding.",
        },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("change_orders")
      .delete()
      .eq("project_id", Number(projectId))
      .eq("id", Number(changeOrderId));

    if (error) {
      return apiErrorResponse(error);
    }

    return NextResponse.json({
      message: "Change order deleted successfully",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
