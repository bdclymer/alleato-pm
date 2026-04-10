import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/api-error";
import { sendEmail } from "@/lib/email/send";
import SOVInvitation from "@/emails/subcontractor/SOVInvitation";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";

interface RouteParams {
  params: Promise<{ projectId: string; commitmentId: string }>;
}

interface SsovLineItemInput {
  id?: string;
  source_sov_item_id: string | null;
  line_number: number | null;
  budget_code: string | null;
  description: string | null;
  amount: number | null;
  billed_to_date: number | null;
}

const STATUS_VALUES = ["draft", "under_review", "approved", "revise_resubmit"] as const;
type SsovStatus = (typeof STATUS_VALUES)[number];

interface CommitmentContext {
  contract_number: string | null;
  title: string | null;
  status: string | null;
  is_private: boolean | null;
  invoice_contact_ids: string[] | null;
  non_admin_user_ids: string[] | null;
  allow_non_admin_view_sov_items: boolean | null;
}

interface SsovPermissions {
  canEdit: boolean;
  canReview: boolean;
  canSendNotification: boolean;
}

async function ensureSubmission(
  supabase: any,
  projectId: number,
  commitmentId: string,
) {
  const existing = await supabase
    .from("subcontractor_sov_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("commitment_id", commitmentId)
    .maybeSingle();

  if (existing.data) return existing.data;

  const created = await supabase
    .from("subcontractor_sov_submissions")
    .insert({
      project_id: projectId,
      commitment_id: commitmentId,
      status: "draft",
    })
    .select("*")
    .single();

  if (created.error) throw created.error;
  return created.data;
}

async function getCommitmentType(supabase: any, commitmentId: string) {
  const { data, error } = await supabase
    .from("commitments_unified")
    .select("commitment_type")
    .eq("id", commitmentId)
    .single();

  if (error || !data) {
    return null;
  }
  return data.commitment_type as string | null;
}
async function getTargetAndSourceSov(supabase: any, commitmentId: string) {
  const { data: sourceSov, error } = await supabase
    .from("subcontract_sov_items")
    .select("id, line_number, budget_code, description, amount, billed_to_date")
    .eq("subcontract_id", commitmentId)
    .order("line_number", { ascending: true });

  if (error) throw error;

  const targetAmount = (sourceSov || []).reduce(
    (sum: number, row: { amount: number | null }) => sum + Number(row.amount ?? 0),
    0,
  );

  return { sourceSov: sourceSov || [], targetAmount };
}

async function getCommitmentContext(
  supabase: any,
  commitmentId: string,
): Promise<CommitmentContext> {
  const { data, error } = await supabase
    .from("subcontracts")
    .select(
      "contract_number, title, status, is_private, invoice_contact_ids, non_admin_user_ids, allow_non_admin_view_sov_items",
    )
    .eq("id", commitmentId)
    .single();

  if (error || !data) {
    throw error || new Error("Commitment not found.");
  }

  return data as CommitmentContext;
}

async function getActorRoleContext(supabase: any, authUserId: string, projectId: number, personId: string) {
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", authUserId)
      .maybeSingle(),
    supabase
      .from("project_directory_memberships")
      .select("role, user_type")
      .eq("project_id", projectId)
      .eq("person_id", personId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const role = (membership?.role || "").toLowerCase();
  const userType = (membership?.user_type || "").toLowerCase();
  const isAdmin = profile?.is_admin === true;
  const isPm = role.includes("project manager") || role === "pm";
  const isUpstream = isAdmin || isPm || userType === "employee" || userType === "admin";

  return { isAdmin, isPm, isUpstream };
}

function canEditSsov(params: {
  actorPersonId: string;
  isUpstream: boolean;
  commitment: CommitmentContext;
}): boolean {
  const { actorPersonId, isUpstream, commitment } = params;
  if (isUpstream) return true;

  const invoiceContacts = commitment.invoice_contact_ids || [];
  const nonAdminUsers = commitment.non_admin_user_ids || [];
  const isInvoiceContact = invoiceContacts.includes(actorPersonId);
  const isNonAdminAllowed =
    nonAdminUsers.includes(actorPersonId) &&
    commitment.allow_non_admin_view_sov_items === true;

  if (commitment.is_private) {
    return isInvoiceContact && isNonAdminAllowed;
  }

  return isInvoiceContact || isNonAdminAllowed;
}

async function getInvoiceContactEmails(supabase: any, invoiceContactIds: string[]) {
  if (invoiceContactIds.length === 0) return [];
  const { data } = await supabase
    .from("people")
    .select("id, first_name, last_name, email")
    .in("id", invoiceContactIds);

  return (data || [])
    .filter((person: { email: string | null }) => !!person.email)
    .map((person: { id: string; first_name: string | null; last_name: string | null; email: string }) => ({
      id: person.id,
      name: `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Invoice Contact",
      email: person.email,
    }));
}

async function sendSsovInviteEmail(args: {
  recipients: Array<{ name: string; email: string }>;
  projectId: number;
  projectName: string;
  commitmentId: string;
  commitmentNumber: string | null;
  commitmentTitle: string | null;
  contractAmount: number;
  pmName: string;
  submissionId: string;
}) {
  const {
    recipients,
    projectId,
    projectName,
    commitmentId,
    commitmentNumber,
    commitmentTitle,
    contractAmount,
    pmName,
    submissionId,
  } = args;
  if (recipients.length === 0) return;

  const subject = `Submit your Schedule of Values${commitmentNumber ? ` — ${commitmentNumber}` : ""}`;
  const submissionUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${projectId}/commitments/${commitmentId}?tab=subcontractor-sov`;
  const contractAmountFormatted = contractAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
  // 14 days from now
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Send individually so each recipient gets personalized greeting + own idempotency key
  await Promise.all(
    recipients.map((recipient) =>
      sendEmail({
        template: "sov-invitation",
        to: recipient.email,
        subject,
        react: SOVInvitation({
          subcontractorName: recipient.name,
          projectName,
          commitmentNumber: commitmentNumber || "—",
          contractAmount: contractAmountFormatted,
          dueDate,
          submissionUrl,
          pmName,
        }),
        entity: { type: "sov_submission", id: submissionId },
        idempotencyKey: `sov-invite/${submissionId}/${recipient.email}`,
        metadata: { projectId, commitmentId, commitmentTitle },
      }),
    ),
  );
}

async function createPmReviewTodos(params: {
  supabase: any;
  projectId: number;
  commitmentId: string;
  commitmentNumber?: string | null;
  commitmentTitle?: string | null;
}) {
  const { supabase, projectId, commitmentId, commitmentNumber, commitmentTitle } = params;

  const { data: pmMembers } = await supabase
    .from("project_directory_memberships")
    .select("person_id, role")
    .eq("project_id", projectId)
    .eq("status", "active");

  const pms = (pmMembers || []).filter((m: { role: string | null }) =>
    (m.role || "").toLowerCase().includes("project manager") ||
    (m.role || "").toLowerCase() === "pm",
  );

  if (pms.length === 0) return;

  const personIds = pms.map((member: { person_id: string }) => member.person_id);
  const { data: authLinks } = await supabase
    .from("users_auth")
    .select("person_id, auth_user_id")
    .in("person_id", personIds);

  const tasks = (authLinks || [])
    .filter((row: { auth_user_id: string | null }) => !!row.auth_user_id)
    .map((row: { auth_user_id: string }) => ({
      user_id: row.auth_user_id,
      task: `Review subcontractor SOV for commitment ${commitmentNumber || commitmentTitle || commitmentId} in project ${projectId}: /${projectId}/commitments/${commitmentId}?tab=subcontractor-sov`,
      is_complete: false,
    }));

  if (tasks.length > 0) {
    const userIds = tasks.map((task: { user_id: string }) => task.user_id);
    const { data: existingTodos } = await supabase
      .from("todos")
      .select("user_id, task, is_complete")
      .in("user_id", userIds)
      .eq("is_complete", false);

    const existingLookup = new Set(
      (existingTodos || []).map(
        (todo: { user_id: string; task: string | null }) =>
          `${todo.user_id}:${todo.task || ""}`,
      ),
    );

    const tasksToInsert = tasks.filter(
      (task: { user_id: string; task: string }) =>
        !existingLookup.has(`${task.user_id}:${task.task}`),
    );

    if (tasksToInsert.length > 0) {
      await supabase.from("todos").insert(tasksToInsert);
    }
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase, membership } = authResult;

    const commitmentType = await getCommitmentType(supabase, commitmentId);
    if (commitmentType !== "subcontract") {
      return NextResponse.json(
        { error: "Subcontractor SOV is available for subcontracts only." },
        { status: 400 },
      );
    }

    const submission = await ensureSubmission(supabase, numericProjectId, commitmentId);
    const commitment = await getCommitmentContext(supabase, commitmentId);
    const actor = await getActorRoleContext(
      supabase,
      membership.authUserId,
      numericProjectId,
      membership.personId,
    );
    const permissions: SsovPermissions = {
      canEdit: canEditSsov({
        actorPersonId: membership.personId,
        isUpstream: actor.isUpstream,
        commitment,
      }),
      canReview: actor.isUpstream,
      canSendNotification: actor.isUpstream,
    };
    const invoiceContacts = await getInvoiceContactEmails(
      supabase,
      commitment.invoice_contact_ids || [],
    );
    const { sourceSov, targetAmount } = await getTargetAndSourceSov(supabase, commitmentId);

    const { data: lineItems, error: lineItemsError } = await supabase
      .from("subcontractor_sov_items")
      .select("id, source_sov_item_id, line_number, budget_code, description, amount, billed_to_date")
      .eq("submission_id", submission.id)
      .order("line_number", { ascending: true });

    if (lineItemsError) throw lineItemsError;

    return NextResponse.json({
      data: {
        submissionId: submission.id,
        status: (submission.status as SsovStatus) || "draft",
        targetAmount,
        sourceSov,
        lineItems: lineItems || [],
        submittedAt: submission.submitted_at || null,
        reviewedAt: submission.reviewed_at || null,
        reviewNotes: submission.review_notes || null,
        inviteSentAt: submission.invite_sent_at || null,
        invoiceContacts,
        permissions,
      },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase, membership } = authResult;

    const body = (await request.json()) as { lineItems: SsovLineItemInput[] };
    if (!Array.isArray(body.lineItems)) {
      return NextResponse.json(
        { error: "Invalid payload: lineItems array required." },
        { status: 400 },
      );
    }

    const submission = await ensureSubmission(supabase, numericProjectId, commitmentId);
    const commitment = await getCommitmentContext(supabase, commitmentId);
    const actor = await getActorRoleContext(
      supabase,
      membership.authUserId,
      numericProjectId,
      membership.personId,
    );

    if (!canEditSsov({
      actorPersonId: membership.personId,
      isUpstream: actor.isUpstream,
      commitment,
    })) {
      return NextResponse.json(
        { error: "You are not allowed to edit this Subcontractor SOV." },
        { status: 403 },
      );
    }

    if (submission.status === "under_review" || submission.status === "approved") {
      return NextResponse.json(
        {
          error:
            "Subcontractor SOV cannot be edited while status is Under Review or Approved.",
        },
        { status: 400 },
      );
    }

    const { data: existingItems } = await supabase
      .from("subcontractor_sov_items")
      .select("id")
      .eq("submission_id", submission.id);

    const existingIds = new Set<string>((existingItems || []).map((row: { id: string }) => row.id));
    const incomingIds = new Set<string>(
      body.lineItems
        .map((row) => row.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    const idsToDelete = [...existingIds].filter((id) => !incomingIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("subcontractor_sov_items")
        .delete()
        .in("id", idsToDelete);
      if (deleteError) throw deleteError;
    }

    for (let i = 0; i < body.lineItems.length; i++) {
      const item = body.lineItems[i];
      const rowData = {
        submission_id: submission.id,
        source_sov_item_id: item.source_sov_item_id || null,
        line_number: item.line_number ?? i + 1,
        budget_code: item.budget_code || null,
        description: item.description || null,
        amount: item.amount ?? 0,
        billed_to_date: item.billed_to_date ?? 0,
        updated_at: new Date().toISOString(),
      };

      if (item.id && existingIds.has(item.id)) {
        const { error } = await supabase
          .from("subcontractor_sov_items")
          .update(rowData)
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subcontractor_sov_items").insert({
          ...rowData,
          created_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
    }

    const { error: touchError } = await supabase
      .from("subcontractor_sov_submissions")
      .update({
        updated_at: new Date().toISOString(),
        status:
          submission.status === "approved"
            ? "revise_resubmit"
            : submission.status,
      })
      .eq("id", submission.id);
    if (touchError) throw touchError;

    return NextResponse.json({ success: true, message: "Subcontractor SOV saved." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId, commitmentId } = await params;
    const numericProjectId = Number.parseInt(projectId, 10);
    if (Number.isNaN(numericProjectId)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const authResult = await verifyProjectAccess(numericProjectId);
    if (isAuthError(authResult)) return authResult;
    const { serviceClient: supabase, membership } = authResult;

    const body = (await request.json()) as {
      action:
        | "submit"
        | "approve"
        | "reject"
        | "import_from_sov"
        | "send_notification";
    };
    if (!body?.action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const submission = await ensureSubmission(supabase, numericProjectId, commitmentId);
    const commitment = await getCommitmentContext(supabase, commitmentId);
    const actor = await getActorRoleContext(
      supabase,
      membership.authUserId,
      numericProjectId,
      membership.personId,
    );
    const { sourceSov, targetAmount } = await getTargetAndSourceSov(supabase, commitmentId);

    const canEdit = canEditSsov({
      actorPersonId: membership.personId,
      isUpstream: actor.isUpstream,
      commitment,
    });

    if (body.action === "import_from_sov") {
      if (!canEdit) {
        return NextResponse.json(
          { error: "You are not allowed to edit this Subcontractor SOV." },
          { status: 403 },
        );
      }
      if (submission.status === "under_review" || submission.status === "approved") {
        return NextResponse.json(
          { error: "Cannot import while status is Under Review or Approved." },
          { status: 400 },
        );
      }
      const { error: clearError } = await supabase
        .from("subcontractor_sov_items")
        .delete()
        .eq("submission_id", submission.id);
      if (clearError) throw clearError;

      if (sourceSov.length > 0) {
        const mapped = sourceSov.map((row: any, index: number) => ({
          submission_id: submission.id,
          source_sov_item_id: row.id,
          line_number: row.line_number ?? index + 1,
          budget_code: row.budget_code || null,
          description: row.description || null,
          amount: row.amount ?? 0,
          billed_to_date: row.billed_to_date ?? 0,
        }));
        const { error: insertError } = await supabase.from("subcontractor_sov_items").insert(mapped);
        if (insertError) throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: "Imported SOV line items into subcontractor SOV.",
      });
    }

    if (body.action === "send_notification") {
      if (!actor.isUpstream) {
        return NextResponse.json(
          { error: "Only upstream project users can send SSOV notifications." },
          { status: 403 },
        );
      }
      const contacts = await getInvoiceContactEmails(
        supabase,
        commitment.invoice_contact_ids || [],
      );
      if (contacts.length === 0) {
        return NextResponse.json(
          {
            error:
              "No invoice contacts found. Add at least one invoice contact before sending SSOV notifications.",
          },
          { status: 400 },
        );
      }

      // Fetch project name + PM name + contract amount for the email template
      const [{ data: project }, { data: pmProfile }] = await Promise.all([
        supabase
          .from("projects")
          .select("name")
          .eq("id", numericProjectId)
          .maybeSingle(),
        supabase
          .from("people")
          .select("first_name, last_name")
          .eq("id", membership.personId)
          .maybeSingle(),
      ]);

      await sendSsovInviteEmail({
        recipients: contacts.map((contact: { name: string; email: string }) => ({
          name: contact.name,
          email: contact.email,
        })),
        projectId: numericProjectId,
        projectName: project?.name || `Project #${numericProjectId}`,
        commitmentId,
        commitmentNumber: commitment.contract_number,
        commitmentTitle: commitment.title,
        contractAmount: targetAmount,
        pmName:
          `${pmProfile?.first_name || ""} ${pmProfile?.last_name || ""}`.trim() ||
          "Your project manager",
        submissionId: submission.id,
      });

      const { error: inviteError } = await supabase
        .from("subcontractor_sov_submissions")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_sent_by: membership.personId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (inviteError) {
        // Backward compatibility: some environments do not yet have invite_sent_by.
        const isMissingInviteSentByColumn =
          inviteError.code === "PGRST204" ||
          inviteError.message?.includes("invite_sent_by");

        if (!isMissingInviteSentByColumn) {
          throw inviteError;
        }

        const { error: fallbackInviteError } = await supabase
          .from("subcontractor_sov_submissions")
          .update({
            invite_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", submission.id);

        if (fallbackInviteError) throw fallbackInviteError;
      }

      return NextResponse.json({
        success: true,
        message: `Subcontractor SOV invitation sent to ${contacts.length} invoice contact${contacts.length !== 1 ? "s" : ""}.`,
      });
    }

    if (body.action === "submit") {
      if (!canEdit) {
        return NextResponse.json(
          { error: "You are not allowed to submit this Subcontractor SOV." },
          { status: 403 },
        );
      }
      if (!(submission.status === "draft" || submission.status === "revise_resubmit")) {
        return NextResponse.json(
          { error: "Subcontractor SOV can only be submitted from Draft or Revise & Resubmit." },
          { status: 400 },
        );
      }
      const { data: lineItems, error: lineItemsError } = await supabase
        .from("subcontractor_sov_items")
        .select("amount")
        .eq("submission_id", submission.id);
      if (lineItemsError) throw lineItemsError;

      const allocated = (lineItems || []).reduce(
        (sum: number, row: { amount: number | null }) => sum + Number(row.amount ?? 0),
        0,
      );
      const remaining = Math.max(targetAmount - allocated, 0);
      if (remaining > 0) {
        return NextResponse.json(
          { error: "Remaining to Allocate must be $0.00 before submitting." },
          { status: 400 },
        );
      }

      const { error: submitError } = await supabase
        .from("subcontractor_sov_submissions")
        .update({
          status: "under_review",
          submitted_by: membership.personId,
          submitted_at: new Date().toISOString(),
          reviewed_by: null,
          reviewed_at: null,
          review_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (submitError) throw submitError;

      await createPmReviewTodos({
        supabase,
        projectId: numericProjectId,
        commitmentId,
        commitmentNumber: commitment.contract_number || null,
        commitmentTitle: commitment.title || null,
      });

      return NextResponse.json({
        success: true,
        message: "Subcontractor SOV submitted for review.",
      });
    }

    if (body.action === "approve" || body.action === "reject") {
      if (!actor.isUpstream) {
        return NextResponse.json(
          { error: "Only upstream project users can review and approve SSOV." },
          { status: 403 },
        );
      }
      if (submission.status !== "under_review") {
        return NextResponse.json(
          { error: "SSOV must be Under Review before it can be approved or returned." },
          { status: 400 },
        );
      }
      const nextStatus: SsovStatus =
        body.action === "approve" ? "approved" : "revise_resubmit";
      const { error: reviewError } = await supabase
        .from("subcontractor_sov_submissions")
        .update({
          status: nextStatus,
          reviewed_by: membership.personId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (reviewError) throw reviewError;

      return NextResponse.json({
        success: true,
        message: body.action === "approve"
          ? "Subcontractor SOV approved."
          : "Subcontractor SOV returned for revision.",
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
