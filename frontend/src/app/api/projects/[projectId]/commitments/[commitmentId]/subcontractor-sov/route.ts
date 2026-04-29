import { withApiGuardrails } from "@/lib/guardrails/api";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { sendEmail } from "@/lib/email/send";
import SOVInvitation from "@/emails/subcontractor/SOVInvitation";
import SubcontractorSovInvite from "@/emails/subcontractor/SubcontractorSovInvite";
import SSOVSubmittedToPM from "@/emails/subcontractor/SSOVSubmittedToPM";
import { APP_BASE_URL } from "@/lib/email/client";
import { isAuthError, verifyProjectAccess } from "@/lib/supabase/auth-guard";
import { createServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/types/database.types";
import {
  canEditSubcontractorSov,
  mergeSubcontractorSovAccessIds,
  type SubcontractorSovCommitmentAccess,
} from "@/lib/commitments/subcontractor-sov-access";

type ServiceClient = ReturnType<typeof createServiceClient>;
type SubcontractorSovSubmissionRow =
  Database["public"]["Tables"]["subcontractor_sov_submissions"]["Row"];
type SourceSovLine = Pick<
  Database["public"]["Tables"]["subcontract_sov_items"]["Row"],
  "id" | "line_number" | "budget_code" | "description" | "amount" | "billed_to_date"
>;
type ProjectMemberForReview = Pick<
  Database["public"]["Tables"]["project_directory_memberships"]["Row"],
  "person_id" | "role"
>;
type AuthLinkForTodo = Pick<
  Database["public"]["Tables"]["users_auth"]["Row"],
  "person_id" | "auth_user_id"
>;
type PersonEmailRow = Pick<
  Database["public"]["Tables"]["people"]["Row"],
  "id" | "first_name" | "last_name" | "email"
>;

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

interface CommitmentContext extends SubcontractorSovCommitmentAccess {
  contract_number: string | null;
  title: string | null;
  status: string | null;
}

interface SsovPermissions {
  canEdit: boolean;
  canReview: boolean;
  canSendNotification: boolean;
}

async function ensureSubmission(
  supabase: ServiceClient,
  projectId: number,
  commitmentId: string,
): Promise<SubcontractorSovSubmissionRow> {
  const existing = await supabase
    .from("subcontractor_sov_submissions")
    .select("*")
    .eq("project_id", projectId)
    .eq("commitment_id", commitmentId)
    .maybeSingle();

  if (existing.error) throw existing.error;
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

async function getCommitmentType(supabase: ServiceClient, commitmentId: string) {
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
async function getTargetAndSourceSov(supabase: ServiceClient, commitmentId: string) {
  const { data: sourceSov, error } = await supabase
    .from("subcontract_sov_items")
    .select("id, line_number, budget_code, description, amount, billed_to_date")
    .eq("subcontract_id", commitmentId)
    .order("line_number", { ascending: true });

  if (error) throw error;

  const rows = (sourceSov || []) as SourceSovLine[];
  const targetAmount = rows.reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0,
  );

  return { sourceSov: rows, targetAmount };
}

async function getCommitmentContext(
  supabase: ServiceClient,
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

async function getActorRoleContext(
  supabase: ServiceClient,
  authUserId: string,
  projectId: number,
  personId: string,
) {
  const [
    { data: profile, error: profileError },
    { data: membership, error: membershipError },
  ] = await Promise.all([
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

  if (profileError) throw profileError;
  if (membershipError) throw membershipError;

  const role = (membership?.role || "").toLowerCase();
  const userType = (membership?.user_type || "").toLowerCase();
  const isAdmin = profile?.is_admin === true;
  const isPm = role.includes("project manager") || role === "pm";
  const isUpstream = isAdmin || isPm || userType === "employee" || userType === "admin";

  return { isAdmin, isPm, isUpstream };
}

async function getInvoiceContactEmails(supabase: ServiceClient, invoiceContactIds: string[]) {
  if (invoiceContactIds.length === 0) return [];
  const { data, error } = await supabase
    .from("people")
    .select("id, first_name, last_name, email")
    .in("id", invoiceContactIds);

  if (error) throw error;

  return (data || [])
    .filter((person): person is PersonEmailRow & { email: string } => !!person.email)
    .map((person) => ({
      id: person.id,
      name: `${person.first_name || ""} ${person.last_name || ""}`.trim() || "Invoice Contact",
      email: person.email,
    }));
}

async function grantSsovAccessToInvoiceContacts(args: {
  supabase: ServiceClient;
  commitmentId: string;
  recipientPersonIds: string[];
}) {
  const { supabase, commitmentId, recipientPersonIds } = args;
  if (recipientPersonIds.length === 0) return;

  const { data: commitment, error } = await supabase
    .from("subcontracts")
    .select("non_admin_user_ids")
    .eq("id", commitmentId)
    .single();

  if (error || !commitment) {
    throw error || new Error("Unable to grant SSOV access because the commitment was not found.");
  }

  const mergedPersonIds = mergeSubcontractorSovAccessIds(
    commitment.non_admin_user_ids || [],
    recipientPersonIds,
  );

  const { error: updateError } = await supabase
    .from("subcontracts")
    .update({
      non_admin_user_ids: mergedPersonIds,
      allow_non_admin_view_sov_items: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commitmentId);

  if (updateError) throw updateError;
}

async function sendSsovInviteEmail(args: {
  recipients: Array<{ id: string; name: string; email: string }>;
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
  if (recipients.length === 0) return [];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const subject = `Submit your Schedule of Values${commitmentNumber ? ` — ${commitmentNumber}` : ""}`;
  const sovTabPath = `/${projectId}/commitments/${commitmentId}?tab=subcontractor-sov`;
  const submissionUrl = `${appUrl}${sovTabPath}`;
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

  const adminSupabase = createServiceClient();

  // Fetch the Subcontractor system permission template ID once for the whole batch.
  const { data: subcontractorTemplate } = await adminSupabase
    .from("permission_templates")
    .select("id")
    .eq("name", "Subcontractor")
    .eq("is_system", true)
    .maybeSingle();
  const subcontractorTemplateId = subcontractorTemplate?.id ?? null;

  await grantSsovAccessToInvoiceContacts({
    supabase: adminSupabase,
    commitmentId,
    recipientPersonIds: recipients.map((recipient) => recipient.id),
  });

  // Check which recipients already have auth accounts
  const { data: existingAuthLinks } = await adminSupabase
    .from("users_auth")
    .select("person_id")
    .in("person_id", recipients.map((r) => r.id));

  const existingPersonIds = new Set((existingAuthLinks || []).map((row: { person_id: string }) => row.person_id));

  // Send individually so each recipient gets personalized greeting + own idempotency key
  return Promise.all(
    recipients.map(async (recipient) => {
      const isNewUser = !existingPersonIds.has(recipient.id);

      if (isNewUser) {
        // Generate a Supabase magic invite link for account creation.
        // After OTP verification, the user lands on /auth/update-password?next=<sovTabPath>
        // where they set their password and are then redirected to the SOV tab.
        const passwordSetupUrl = `/auth/update-password?next=${encodeURIComponent(sovTabPath)}`;
        const confirmBaseUrl = `${appUrl}/auth/confirm`;

        const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
          type: "invite",
          email: recipient.email,
          options: {
            // redirectTo is where Supabase sends the browser after OTP verification.
            // We point it at our /auth/confirm route which handles the token_hash.
            // However, generateLink returns an action_link we can rewrite for SSR.
            redirectTo: `${appUrl}/auth/callback`,
          },
        });

        if (linkError || !linkData?.properties?.action_link) {
          logger.error({ msg: `[ssov-invite] Failed to generate invite link for ${recipient.email}`, error: linkError instanceof Error ? linkError.message : String(linkError) });
          // Fall back to sending a regular notification with the direct (auth-required) link
          return sendEmail({
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
          });
        }

        // Extract the OTP token from the action_link and build a SSR-friendly confirm URL.
        // The action_link looks like: https://PROJECT.supabase.co/auth/v1/verify?token=TOKEN&type=invite&...
        const actionUrl = new URL(linkData.properties.action_link);
        const token = actionUrl.searchParams.get("token");

        let inviteUrl: string;
        if (token) {
          // Build our own SSR-safe confirm URL so the session is set via cookies
          inviteUrl = `${confirmBaseUrl}?token_hash=${token}&type=invite&next=${encodeURIComponent(passwordSetupUrl)}`;
        } else {
          // Fallback: use the raw action_link (less ideal for SSR)
          inviteUrl = linkData.properties.action_link;
        }

        // Ensure the person has a subcontractor membership for this project so they
        // can access it after logging in.
        await adminSupabase
          .from("project_directory_memberships")
          .upsert(
            {
              person_id: recipient.id,
              project_id: projectId,
              user_type: "subcontractor",
              status: "active",
              ...(subcontractorTemplateId ? { permission_template_id: subcontractorTemplateId } : {}),
            },
            { onConflict: "person_id,project_id", ignoreDuplicates: false },
          );

        return sendEmail({
          template: "sov-invite-new-user",
          to: recipient.email,
          subject: `You're invited: ${subject}`,
          react: SubcontractorSovInvite({
            subcontractorName: recipient.name,
            projectName,
            commitmentNumber: commitmentNumber || "—",
            contractAmount: contractAmountFormatted,
            dueDate,
            inviteUrl,
            pmName,
          }),
          entity: { type: "sov_submission", id: submissionId },
          idempotencyKey: `sov-invite-new/${submissionId}/${recipient.email}`,
          metadata: { projectId, commitmentId, commitmentTitle },
        });
      }

      // Ensure existing users also have the subcontractor membership + template assigned.
      await adminSupabase
        .from("project_directory_memberships")
        .upsert(
          {
            person_id: recipient.id,
            project_id: projectId,
            user_type: "subcontractor",
            status: "active",
            ...(subcontractorTemplateId ? { permission_template_id: subcontractorTemplateId } : {}),
          },
          { onConflict: "person_id,project_id", ignoreDuplicates: false },
        );

      // Existing user — send standard notification with direct link
      return sendEmail({
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
      });
    }),
  );
}

async function notifyPMsOfSsovSubmission(args: {
  supabase: ServiceClient;
  projectId: number;
  commitmentId: string;
  commitmentNumber: string | null;
  commitmentTitle: string | null;
  contractAmount: number;
  submissionId: string;
}) {
  const {
    supabase,
    projectId,
    commitmentId,
    commitmentNumber,
    commitmentTitle,
    contractAmount,
    submissionId,
  } = args;

  // Find PMs on the project
  const { data: pmMembers } = await supabase
    .from("project_directory_memberships")
    .select("person_id, role")
    .eq("project_id", projectId)
    .eq("status", "active");

  const projectMembers = (pmMembers || []) as ProjectMemberForReview[];
  const pmPersonIds = projectMembers
    .filter((m) => {
      const r = (m.role || "").toLowerCase();
      return r.includes("project manager") || r === "pm";
    })
    .map((m) => m.person_id);

  if (pmPersonIds.length === 0) return;

  const [{ data: people }, { data: project }, { data: subcontract }] =
    await Promise.all([
      supabase
        .from("people")
        .select("id, first_name, last_name, email")
        .in("id", pmPersonIds),
      supabase
        .from("projects")
        .select("name")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("subcontracts")
        .select("contract_company_id")
        .eq("id", commitmentId)
        .maybeSingle(),
    ]);

  const recipients: Array<{ name: string; email: string }> = ((people || []) as PersonEmailRow[])
    .filter((p): p is PersonEmailRow & { email: string } => !!p.email)
    .map((p) => ({
      name:
        `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
        "Project manager",
      email: p.email,
    }));

  if (recipients.length === 0) return;

  // Resolve subcontractor display name
  let subcontractorName = commitmentTitle || "A subcontractor";
  if (subcontract?.contract_company_id) {
    const { data: vendor } = await supabase
      .from("companies")
      .select("name")
      .eq("id", subcontract.contract_company_id)
      .maybeSingle();
    if (vendor?.name) subcontractorName = vendor.name;
  }

  const projectName = project?.name || `Project #${projectId}`;
  const reviewUrl = `${APP_BASE_URL}/${projectId}/commitments/${commitmentId}?tab=subcontractor-sov`;
  const contractAmountFormatted = contractAmount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
  const subject = `Subcontractor SOV submitted${commitmentNumber ? ` — ${commitmentNumber}` : ""} — review needed`;

  await Promise.all(
    recipients.map((r) =>
      sendEmail({
        template: "sov-submitted-to-pm",
        to: r.email,
        subject,
        react: SSOVSubmittedToPM({
          pmName: r.name,
          subcontractorName,
          projectName,
          commitmentNumber: commitmentNumber || "—",
          commitmentTitle: commitmentTitle || "—",
          contractAmount: contractAmountFormatted,
          reviewUrl,
        }),
        entity: { type: "sov_submission", id: submissionId },
        idempotencyKey: `sov-submitted/${submissionId}/${r.email}`,
      }),
    ),
  );
}

async function createPmReviewTodos(params: {
  supabase: ServiceClient;
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

  const projectMembers = (pmMembers || []) as ProjectMemberForReview[];
  const pms = projectMembers.filter((m) =>
    (m.role || "").toLowerCase().includes("project manager") ||
    (m.role || "").toLowerCase() === "pm",
  );

  if (pms.length === 0) return;

  const personIds = pms.map((member) => member.person_id);
  const { data: authLinks } = await supabase
    .from("users_auth")
    .select("person_id, auth_user_id")
    .in("person_id", personIds);

  const tasks = ((authLinks || []) as AuthLinkForTodo[])
    .filter((row) => !!row.auth_user_id)
    .map((row) => ({
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

export const GET = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/subcontractor-sov#GET",
  async ({ request, params }) => {
  
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
      canEdit: canEditSubcontractorSov({
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
    },
);

export const PUT = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/subcontractor-sov#PUT",
  async ({ request, params }) => {
  
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

    if (!canEditSubcontractorSov({
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
    },
);

export const POST = withApiGuardrails(
  "projects/[projectId]/commitments/[commitmentId]/subcontractor-sov#POST",
  async ({ request, params }) => {
  
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

    const canEdit = canEditSubcontractorSov({
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
        const mapped = sourceSov.map((row, index) => ({
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

      const sendResults = await sendSsovInviteEmail({
        recipients: contacts.map((contact: { id: string; name: string; email: string }) => ({
          id: contact.id,
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

      const failedSends = sendResults.filter((result) => result.error);
      if (failedSends.length > 0) {
        const message = failedSends
          .map((result) => result.error?.message)
          .filter(Boolean)
          .join("; ");
        return NextResponse.json(
          {
            error:
              message ||
              "Subcontractor SOV invitation email failed to send.",
          },
          { status: 502 },
        );
      }

      const { error: inviteError } = await supabase
        .from("subcontractor_sov_submissions")
        .update({
          invite_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (inviteError) {
        throw inviteError;
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

      // Fire-and-forget: create PM todos + send PM email notifications
      createPmReviewTodos({
        supabase,
        projectId: numericProjectId,
        commitmentId,
        commitmentNumber: commitment.contract_number || null,
        commitmentTitle: commitment.title || null,
      }).catch((err) => {
        logger.error({ msg: "[ssov-submit] PM review todos failed", error: err instanceof Error ? err.message : String(err) });
      });

      notifyPMsOfSsovSubmission({
        supabase,
        projectId: numericProjectId,
        commitmentId,
        commitmentNumber: commitment.contract_number,
        commitmentTitle: commitment.title,
        contractAmount: targetAmount,
        submissionId: submission.id,
      }).catch((err) => {
        logger.error({ msg: "[ssov-submit] PM email notification failed", error: err instanceof Error ? err.message : String(err) });
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
    },
);
