/**
 * RFI API Route (Single Resource)
 *
 * GET /api/projects/[projectId]/rfis/[rfiId] - Get single RFI
 * PATCH /api/projects/[projectId]/rfis/[rfiId] - Update RFI
 * DELETE /api/projects/[projectId]/rfis/[rfiId] - Delete RFI
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sendEmail } from "@/lib/email/send";
import { APP_BASE_URL } from "@/lib/email/client";
import RFIClosedNotification from "@/emails/rfi/RFIClosedNotification";
import { rfiEditSchema } from "@/lib/schemas/rfi-schema";
import { ZodError } from "zod";

type RouteParams = {
  params: Promise<{ projectId: string; rfiId: string }>;
};

/**
 * GET /api/projects/[projectId]/rfis/[rfiId]
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("rfis")
      .select("*")
      .eq("id", rfiId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "RFI not found" }, { status: 404 });
      }
      console.error("RFI get error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

/**
 * PATCH /api/projects/[projectId]/rfis/[rfiId]
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate update data
    const result = rfiEditSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.flatten() },
        { status: 400 },
      );
    }

    // Build update object from validated fields
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const validatedData = result.data;
    if (validatedData.subject !== undefined)
      updateData.subject = validatedData.subject;
    if (validatedData.question !== undefined)
      updateData.question = validatedData.question;
    if (validatedData.due_date !== undefined)
      updateData.due_date = validatedData.due_date;
    if (validatedData.assignees !== undefined)
      updateData.assignees = validatedData.assignees;
    if (validatedData.rfi_manager !== undefined)
      updateData.rfi_manager = validatedData.rfi_manager;
    if (validatedData.received_from !== undefined)
      updateData.received_from = validatedData.received_from;
    if (validatedData.responsible_contractor !== undefined)
      updateData.responsible_contractor = validatedData.responsible_contractor;
    if (validatedData.distribution_list !== undefined)
      updateData.distribution_list = validatedData.distribution_list;
    if (validatedData.location !== undefined)
      updateData.location = validatedData.location;
    if (validatedData.specification !== undefined)
      updateData.specification = validatedData.specification;
    if (validatedData.cost_code !== undefined)
      updateData.cost_code = validatedData.cost_code;
    if (validatedData.schedule_impact !== undefined)
      updateData.schedule_impact = validatedData.schedule_impact;
    if (validatedData.cost_impact !== undefined)
      updateData.cost_impact = validatedData.cost_impact;
    if (validatedData.reference !== undefined)
      updateData.reference = validatedData.reference;
    if (validatedData.is_private !== undefined)
      updateData.is_private = validatedData.is_private;
    if (validatedData.rfi_stage !== undefined)
      updateData.rfi_stage = validatedData.rfi_stage;
    if (validatedData.drawing_number !== undefined)
      updateData.drawing_number = validatedData.drawing_number;

    // Handle status changes from body (not in base schema)
    if (body.status !== undefined) {
      let newStatus = body.status as string;

      // Fetch current RFI status for transition logic
      const { data: currentRfi } = await supabase
        .from("rfis")
        .select("status, assignees")
        .eq("id", rfiId)
        .single();

      const currentStatus = currentRfi?.status ?? "";

      // Close from Draft → closed-draft
      if (newStatus === "closed" && currentStatus === "draft") {
        newStatus = "closed-draft";
      }

      // Reopen logic
      if (newStatus === "open" && currentStatus === "closed") {
        // Reopen from closed → open
        updateData.closed_date = null;
        updateData.ball_in_court =
          currentRfi?.assignees?.join(", ") ?? null;
      } else if (newStatus === "draft" && currentStatus === "closed-draft") {
        // Reopen from closed-draft → draft
        updateData.closed_date = null;
      } else if (newStatus === "closed" || newStatus === "closed-draft") {
        // Closing — set closed_date and clear ball_in_court
        updateData.closed_date = new Date().toISOString().split("T")[0];
        updateData.ball_in_court = null;
      }

      updateData.status = newStatus;
    }

    const { data, error } = await supabase
      .from("rfis")
      .update(updateData)
      .eq("id", rfiId)
      .select()
      .single();

    if (error) {
      console.error("RFI update error:", error);
      return apiErrorResponse(error);
    }

    // Fire-and-forget: notify relevant people when RFI is closed
    const newStatus = updateData.status as string | undefined;
    if (newStatus === "closed" || newStatus === "closed-draft") {
      const { projectId } = await params;
      notifyRfiClosed({
        projectId: parseInt(projectId, 10),
        rfiId,
        closedByUserId: user.id,
      }).catch((err) => {
        console.error("[rfi-close] notification failed", err);
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", issues: error.issues },
        { status: 400 },
      );
    }
    return apiErrorResponse(error);
  }
}

// ── RFI closed notification ────────────────────────────────────────────────

async function notifyRfiClosed(args: {
  projectId: number;
  rfiId: string;
  closedByUserId: string;
}) {
  const { projectId, rfiId, closedByUserId } = args;
  const supabase = createServiceClient();

  // Load the RFI
  const { data: rfi } = await supabase
    .from("rfis")
    .select(
      "id, number, subject, created_by, assignees, distribution_list, rfi_manager",
    )
    .eq("id", rfiId)
    .maybeSingle();
  if (!rfi) return;

  // Build a unique set of person IDs to notify:
  // creator, assignees, distribution list, RFI manager
  const personIds = new Set<string>();
  if (rfi.created_by) personIds.add(rfi.created_by);
  if (rfi.rfi_manager) personIds.add(rfi.rfi_manager);
  for (const a of rfi.assignees || []) personIds.add(a);
  for (const d of rfi.distribution_list || []) personIds.add(d);

  if (personIds.size === 0) return;

  // Resolve people to emails and the closer's name
  const [{ data: people }, { data: project }, { data: closerProfile }] =
    await Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name, email")
        .in("id", [...personIds]),
      supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", closedByUserId)
        .maybeSingle(),
    ]);

  const closedBy =
    closerProfile?.full_name?.trim() ||
    closerProfile?.email?.split("@")[0] ||
    "A team member";

  const recipients: Array<{ name: string; email: string }> = (people || [])
    .filter((p: { email: string | null }) => !!p.email)
    .map(
      (p: {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }) => ({
        name:
          `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Team member",
        email: p.email as string,
      }),
    );

  if (recipients.length === 0) return;

  const projectName = project?.name || `Project #${projectId}`;
  const viewUrl = `${APP_BASE_URL}/${projectId}/rfis/${rfiId}`;
  const subject = `RFI #${rfi.number} closed — ${rfi.subject}`;

  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        template: "rfi-closed",
        to: r.email,
        subject,
        react: RFIClosedNotification({
          recipientName: r.name,
          projectName,
          rfiNumber: rfi.number,
          rfiSubject: rfi.subject,
          closedBy,
          viewUrl,
        }),
        entity: { type: "rfi", id: rfiId },
        idempotencyKey: `rfi-closed/${rfiId}/${r.email}`,
      }),
    ),
  );
}

/**
 * DELETE /api/projects/[projectId]/rfis/[rfiId]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { rfiId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase.from("rfis").delete().eq("id", rfiId);

    if (error) {
      console.error("RFI delete error:", error);
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "RFI deleted successfully", id: rfiId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
