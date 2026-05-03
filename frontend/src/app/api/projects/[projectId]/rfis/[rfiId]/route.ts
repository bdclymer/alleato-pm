/**
 * RFI API Route (Single Resource)
 *
 * GET /api/projects/[projectId]/rfis/[rfiId] - Get single RFI
 * PATCH /api/projects/[projectId]/rfis/[rfiId] - Update RFI
 * DELETE /api/projects/[projectId]/rfis/[rfiId] - Delete RFI
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { sendEmail } from "@/lib/email/send";
import { APP_BASE_URL } from "@/lib/email/client";
import RFIClosedNotification from "@/emails/rfi/RFIClosedNotification";
import { rfiEditSchema } from "@/lib/schemas/rfi-schema";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

type RouteParams = {
  params: Promise<{ projectId: string; rfiId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/projects/[projectId]/rfis/[rfiId]
 */
export const GET = withApiGuardrails(
  "projects/[projectId]/rfis/[rfiId]#GET",
  async ({ request, params }) => {

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
      logger.error({ msg: "RFI get error:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    // If created_by is a UUID, resolve it to an email/name for display.
    if (data.created_by && UUID_PATTERN.test(data.created_by)) {
      const serviceSupabase = createServiceClient();
      const { data: profile } = await serviceSupabase
        .from("user_profiles")
        .select("full_name, email")
        .eq("id", data.created_by)
        .maybeSingle();
      if (profile) {
        data.created_by =
          profile.full_name?.trim() ||
          profile.email ||
          data.created_by;
      }
    }

    return NextResponse.json(data);
    },
);

/**
 * PATCH /api/projects/[projectId]/rfis/[rfiId]
 */
export const PATCH = withApiGuardrails(
  "projects/[projectId]/rfis/[rfiId]#PATCH",
  async ({ request, params }) => {
  
    const { rfiId } = await params;
    const supabase = await createClient();
    const body = await request.json();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/rfis/[rfiId]#PATCH", message: "Authentication required." });
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

    // When assignees change, sync ball_in_court (unless a status change will handle it)
    if (validatedData.assignees !== undefined && body.status === undefined) {
      const { data: currentRfi } = await supabase
        .from("rfis")
        .select("status")
        .eq("id", rfiId)
        .single();
      const isOpen = !["closed", "closed-draft"].includes(currentRfi?.status ?? "");
      if (isOpen) {
        updateData.ball_in_court =
          validatedData.assignees.length > 0
            ? validatedData.assignees.join(", ")
            : null;
      }
    }

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
      logger.error({ msg: "RFI update error:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    // Closing an RFI is a user-visible notification action. Do not let it
    // silently succeed without a traceable email send.
    const newStatus = updateData.status as string | undefined;
    if (newStatus === "closed" || newStatus === "closed-draft") {
      const { projectId } = await params;
      const notificationResult = await notifyRfiClosed({
        projectId: parseInt(projectId, 10),
        rfiId,
        closedByUserId: user.id,
      });

      if (notificationResult.failed.length > 0) {
        return NextResponse.json(
          {
            error: "RFI was closed, but one or more close notification emails failed.",
            details: notificationResult.failed,
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json(data);
    },
);

// ── RFI closed notification ────────────────────────────────────────────────

async function notifyRfiClosed(args: {
  projectId: number;
  rfiId: string;
  closedByUserId: string;
}): Promise<{ sent: number; failed: Array<{ email?: string; error: string }> }> {
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
  if (!rfi) {
    return { sent: 0, failed: [{ error: "RFI not found for close notification." }] };
  }

  // Build a unique set of person IDs to notify:
  // creator, assignees, distribution list, RFI manager
  const personIds = new Set<string>();
  const creatorEmails = new Set<string>();
  if (rfi.created_by) {
    if (UUID_PATTERN.test(rfi.created_by)) {
      personIds.add(rfi.created_by);
    } else if (rfi.created_by.includes("@")) {
      creatorEmails.add(rfi.created_by);
    }
  }
  if (rfi.rfi_manager && UUID_PATTERN.test(rfi.rfi_manager)) {
    personIds.add(rfi.rfi_manager);
  }
  for (const a of rfi.assignees || []) {
    if (UUID_PATTERN.test(a)) personIds.add(a);
  }
  for (const d of rfi.distribution_list || []) {
    if (UUID_PATTERN.test(d)) personIds.add(d);
  }

  if (personIds.size === 0 && creatorEmails.size === 0) {
    return { sent: 0, failed: [{ error: "No RFI notification recipients were selected." }] };
  }

  // Resolve people to emails and the closer's name
  const [
    { data: peopleById, error: peopleByIdError },
    { data: peopleByEmail, error: peopleByEmailError },
    { data: project },
    { data: closerProfile },
  ] = await Promise.all([
    personIds.size > 0
      ? supabase
          .from("people")
          .select("id, first_name, last_name, email")
          .in("id", [...personIds])
      : Promise.resolve({ data: [], error: null }),
    creatorEmails.size > 0
      ? supabase
          .from("people")
          .select("id, first_name, last_name, email")
          .in("email", [...creatorEmails])
      : Promise.resolve({ data: [], error: null }),
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

  if (peopleByIdError || peopleByEmailError) {
    return {
      sent: 0,
      failed: [
        {
          error:
            peopleByIdError?.message ??
            peopleByEmailError?.message ??
            "Failed to resolve RFI notification recipients.",
        },
      ],
    };
  }

  const closedBy =
    closerProfile?.full_name?.trim() ||
    closerProfile?.email?.split("@")[0] ||
    "A team member";

  const people = [...(peopleById || []), ...(peopleByEmail || [])];
  const recipientByEmail = new Map<string, { name: string; email: string }>();
  for (const p of people) {
    if (!p.email) continue;
    recipientByEmail.set(p.email, {
      name:
        `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Team member",
      email: p.email,
    });
  }

  const recipients: Array<{ name: string; email: string }> = [
    ...recipientByEmail.values(),
  ];

  if (recipients.length === 0) {
    return { sent: 0, failed: [{ error: "No RFI notification recipients have valid email addresses." }] };
  }

  const projectName = project?.name || `Project #${projectId}`;
  const viewUrl = `${APP_BASE_URL}/${projectId}/rfis/${rfiId}`;
  const subject = `RFI #${rfi.number} closed — ${rfi.subject}`;

  const results = await Promise.all(
    recipients.map(async (r) => {
      const result = await sendEmail({
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
        metadata: {
          project_id: projectId,
          rfi_id: rfiId,
          recipient_email: r.email,
        },
      });

      return { email: r.email, result };
    }),
  );

  const failed = results
    .filter(({ result }) => result.error)
    .map(({ email, result }) => ({
      email,
      error: result.error?.message ?? "Failed to send RFI close notification.",
    }));

  return { sent: results.length - failed.length, failed };
}

/**
 * DELETE /api/projects/[projectId]/rfis/[rfiId]
 */
export const DELETE = withApiGuardrails(
  "projects/[projectId]/rfis/[rfiId]#DELETE",
  async ({ request, params }) => {
  
    const { rfiId } = await params;
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/rfis/[rfiId]#DELETE", message: "Authentication required." });
    }

    const { error } = await supabase.from("rfis").delete().eq("id", rfiId);

    if (error) {
      logger.error({ msg: "RFI delete error:", error: error instanceof Error ? error.message : String(error) });
      return apiErrorResponse(error);
    }

    return NextResponse.json({ message: "RFI deleted successfully", id: rfiId });
    },
);
