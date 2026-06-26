/**
 * Action Tools — The Write Layer (continued)
 *
 * IMPORTANT: Copy this full file to action-tools.ts — it replaces the stub above.
 * Split into two writes due to file size.
 */

import { tool } from "ai";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";
import type { CommitmentDraftWidgetPayload } from "@/lib/ai/assistant-widgets";
import type { Database, Json } from "@/types/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "./guardrails";
import { type ToolTracePayload, getOpenAI, withWriteTrace } from "./tool-utils";
import { wrapToolSetWithOutboundActionPolicy } from "./outbound-action-policy";
import {
  RISK_CARD_TYPES,
  deriveSeverity,
  mapLegacyInsightTypeToCardType,
  severityToConfidence,
  resolveTargetIdsForProjects,
  insightCardBaseQuery,
} from "@/lib/ai/insight-cards";
import { buildAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { createGitHubIssue } from "@/lib/admin-feedback/github";
import { matchFeedbackToTool } from "@/lib/admin-feedback/tool-matcher";
import { resolveToolContext, contextToAgentPayload } from "@/lib/admin-feedback/context-resolver";
import { ingestAdminFeedbackLearning } from "@/lib/ai/services/agent-learning-service";
import { buildTaskFewShotBlock } from "@/lib/ai/services/task-training-service";
import {
  buildCalendarInviteAdaptiveCard,
  createOutlookCalendarInvite,
  resolveOutlookOrganizerEmail,
} from "@/lib/microsoft-graph/calendar-invites";
import {
  buildOutlookMailDraftAdaptiveCard,
  createOutlookMailDraft,
  resolveOutlookMailboxUserId,
} from "@/lib/microsoft-graph/mail";
import {
  buildChangeRequestReviewCard,
  renderChangeRequestToolDescription,
} from "@/lib/ai/change-request-field-guide";
import {
  buildChangeRequestPreviewFields,
  normalizeChangeRequestDraft,
} from "@/lib/ai/workflow-registry";
import {
  notifyChangeRequestReviewNeeded,
  notifyRfiReviewNeeded,
} from "@/services/notificationService";
import {
  recordAiNotificationDecision,
  type AiNotificationDecisionLedgerResult,
} from "@/lib/ai/notification-decision-ledger";

export type ActionToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

export type CreateRFIPreviewInput = {
  projectId: number;
  subject: string;
  question: string;
  ballInCourt?: string;
  dueDate?: string;
  costImpact?: "yes" | "no" | "tbd";
  scheduleImpact?: "yes" | "no" | "tbd";
};

const generatedTaskPrioritySchema = z.enum(["low", "normal", "medium", "high", "critical", "urgent"]);
const generatedTaskStatusSchema = z.enum(["open", "in_progress", "completed", "done", "blocked", "cancelled"]);
const projectCompanyTypeSchema = z.enum([
  "YOUR_COMPANY",
  "VENDOR",
  "SUBCONTRACTOR",
  "SUPPLIER",
  "CONNECTED_COMPANY",
]);

const outlookInviteAttendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  type: z.enum(["required", "optional"]).default("required"),
});

const outlookMailRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const commitmentLineItemSchema = z.object({
  budgetCode: z.string().optional(),
  description: z.string().describe("SOV line item description"),
  amount: z.number().describe("Line item amount in dollars"),
  quantity: z.number().optional(),
  unitCost: z.number().optional(),
  uom: z.string().optional(),
  retainagePercent: z.number().optional(),
});

const BRANDON_EMAIL_VOICE_PROFILE = {
  path: "docs/archive/2026-06-22-docs-migration/ai-plan/brandon-email-voice-profile.md",
  version: "2026-05-19",
  companionResources: [
    "docs/archive/2026-06-22-docs-migration/ai-plan/brandon-operating-profile.md",
    "docs/archive/2026-06-22-docs-migration/ai-plan/brandon-email-drafting-playbook.md",
  ],
  summary:
    "For Brandon's Outlook drafts, write short, direct, action-oriented replies grounded in the current thread. Start with the ask or answer, preserve cost/scope/schedule facts, use plain construction/business language, and turn weak evidence into a direct confirmation question.",
} as const;

export function normalizeGeneratedTaskPriority(
  priority?: z.infer<typeof generatedTaskPrioritySchema> | null,
): "low" | "medium" | "high" | "urgent" {
  if (priority === "critical" || priority === "urgent") return "urgent";
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}

export function normalizeGeneratedTaskStatus(
  status?: z.infer<typeof generatedTaskStatusSchema> | null,
): "open" | "in_progress" | "blocked" | "done" | "cancelled" {
  if (status === "completed" || status === "done") return "done";
  if (status === "in_progress") return "in_progress";
  if (status === "blocked") return "blocked";
  if (status === "cancelled") return "cancelled";
  return "open";
}

type CommitmentDraftPreviewInput = {
  projectId: number;
  type: "subcontract" | "purchase_order";
  title: string;
  contractNumber: string;
  status: string;
  vendorName?: string | null;
  contractCompanyId?: string | null;
  description?: string | null;
  startDate?: string | null;
  estimatedCompletionDate?: string | null;
  defaultRetainagePercent?: number | null;
  lineItems?: CommitmentLineItemInput[];
};

type CommitmentLineItemInput = z.infer<typeof commitmentLineItemSchema>;
type Tables = Database["public"]["Tables"];
type SubcontractSovInsert = Tables["subcontract_sov_items"]["Insert"];
type PurchaseOrderSovInsert = Tables["purchase_order_sov_items"]["Insert"];
type CommitmentSovInsert = SubcontractSovInsert | PurchaseOrderSovInsert;

function normalizeCommitmentLineItems(
  lineItems?: CommitmentLineItemInput[] | null,
): CommitmentLineItemInput[] {
  return (lineItems ?? []).map((item) => ({
    ...item,
    budgetCode: item.budgetCode?.trim() || undefined,
    description: item.description.trim(),
    uom: item.uom?.trim() || undefined,
  }));
}

export function validateCommitmentLineItems(
  lineItems?: CommitmentLineItemInput[] | null,
): string[] {
  const errors: string[] = [];
  normalizeCommitmentLineItems(lineItems).forEach((item, index) => {
    const label = `Line ${index + 1}`;
    if (!item.description) {
      errors.push(`${label}: description is required.`);
    }
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      errors.push(`${label}: amount must be zero or greater.`);
    }
    if (item.quantity != null && (!Number.isFinite(item.quantity) || item.quantity < 0)) {
      errors.push(`${label}: quantity must be zero or greater.`);
    }
    if (item.unitCost != null && (!Number.isFinite(item.unitCost) || item.unitCost < 0)) {
      errors.push(`${label}: unit cost must be zero or greater.`);
    }
    if (item.retainagePercent != null && (!Number.isFinite(item.retainagePercent) || item.retainagePercent < 0)) {
      errors.push(`${label}: retainage percent must be zero or greater.`);
    }
  });
  return errors;
}

export function buildCommitmentSovInserts(params: {
  commitmentId: string;
  type: "subcontract" | "purchase_order";
  lineItems?: CommitmentLineItemInput[] | null;
}): CommitmentSovInsert[] {
  const now = new Date().toISOString();
  return normalizeCommitmentLineItems(params.lineItems).map((item, index) => {
    const lineNumber = index + 1;
    const base = {
      line_number: lineNumber,
      budget_code: item.budgetCode ?? null,
      description: item.description,
      amount: item.amount,
      billed_to_date: 0,
      quantity: item.quantity ?? null,
      unit_cost: item.unitCost ?? null,
      created_at: now,
      updated_at: now,
    };

    if (params.type === "subcontract") {
      return {
        ...base,
        subcontract_id: params.commitmentId,
        unit_of_measure: item.uom ?? null,
        retainage_percent: item.retainagePercent ?? null,
      } satisfies SubcontractSovInsert;
    }

    return {
      ...base,
      purchase_order_id: params.commitmentId,
      uom: item.uom ?? null,
    } satisfies PurchaseOrderSovInsert;
  });
}

export function buildCommitmentDraftWidget(
  input: CommitmentDraftPreviewInput,
): CommitmentDraftWidgetPayload {
  const vendorResolved = Boolean(input.contractCompanyId);
  const commitmentLabel = input.type === "subcontract" ? "Subcontract" : "Purchase order";
  const lineItems = normalizeCommitmentLineItems(input.lineItems);
  const lineItemErrors = validateCommitmentLineItems(lineItems);
  const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const validation: CommitmentDraftWidgetPayload["validation"] = [
    {
      label: "Project",
      status: Number.isFinite(input.projectId) ? "pass" : "fail",
      message: Number.isFinite(input.projectId) ? `Project ${input.projectId}` : "Missing project.",
    },
    {
      label: "Vendor",
      status: vendorResolved ? "pass" : "fail",
      message: vendorResolved
        ? "Vendor is linked to a company record."
        : input.vendorName
          ? `No matching vendor company was found for "${input.vendorName}".`
          : "Vendor is required before creating a commitment.",
    },
    {
      label: "Contract number",
      status: input.contractNumber ? "pass" : "warning",
      message: input.contractNumber || "Contract number will need to be assigned.",
    },
    {
      label: "SOV lines",
      status: lineItemErrors.length > 0 ? "fail" : lineItems.length > 0 ? "pass" : "warning",
      message:
        lineItemErrors[0] ??
        (lineItems.length > 0
          ? `${lineItems.length} line item${lineItems.length === 1 ? "" : "s"} totaling ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalAmount)}.`
          : "No SOV lines provided; the commitment will be created without a contract value."),
    },
  ];

  return {
    type: "commitment_draft",
    id: "commitment-draft-preview",
    title: `${commitmentLabel} draft`,
    commitmentType: input.type,
    projectId: input.projectId,
    contractNumber: input.contractNumber,
    vendorName: input.vendorName ?? null,
    vendorResolved,
    fields: [
      { label: "Title", value: input.title, editable: true },
      { label: "Vendor", value: input.vendorName ?? "", editable: true },
      { label: "Status", value: input.status, editable: true },
      { label: "Scope", value: input.description ?? "", editable: true, multiline: true },
      { label: "Start date", value: input.startDate ?? "", editable: true },
      {
        label: input.type === "purchase_order" ? "Delivery date" : "Estimated completion",
        value: input.estimatedCompletionDate ?? "",
        editable: true,
      },
      {
        label: "Retainage %",
        value: input.defaultRetainagePercent == null ? "" : String(input.defaultRetainagePercent),
        editable: true,
      },
    ],
    validation,
    lineItems: lineItems.map((item, index) => ({
      id: `line-${index + 1}`,
      costCode: item.budgetCode ?? null,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity ?? null,
      unitCost: item.unitCost ?? null,
      uom: item.uom ?? null,
    })),
    totalAmount,
    confirmPrompt:
      "Create this commitment with createCommitment. Use confirmed: false for any revised preview, and confirmed: true only after I explicitly confirm.",
  };
}

function resolvePreviewEventKey(
  toolName: string,
  input: Record<string, unknown>,
): string {
  return createHash("sha256")
    .update(`${toolName}:preview:${JSON.stringify(input)}`)
    .digest("hex");
}

async function recordChangeEventPreviewNotificationDecision({
  userId,
  projectId,
  title,
  eventKey,
}: {
  userId: string;
  projectId: number;
  title: string;
  eventKey: string;
}): Promise<AiNotificationDecisionLedgerResult> {
  return recordAiNotificationDecision({
    recipientUserId: userId,
    eventType: "ai_change_event_awaiting_approval",
    severity: "normal",
    projectId,
    entityType: "change_events",
    eventKey,
    title: "AI change event draft ready",
    body: `Review, edit, or confirm the AI-created change event draft: ${title}`,
    preferenceHints: {
      suppressTeams: true,
    },
    isUserOnRelatedPage: true,
  });
}

async function recordCommitmentPreviewNotificationDecision({
  userId,
  projectId,
  title,
  type,
  eventKey,
}: {
  userId: string;
  projectId: number;
  title: string;
  type: "subcontract" | "purchase_order";
  eventKey: string;
}): Promise<AiNotificationDecisionLedgerResult> {
  return recordAiNotificationDecision({
    recipientUserId: userId,
    eventType: "ai_commitment_awaiting_approval",
    severity: "normal",
    projectId,
    entityType: type === "subcontract" ? "subcontracts" : "purchase_orders",
    eventKey,
    title: "AI commitment draft ready",
    body: `Confirm vendor, dates, and line items before creating the AI-drafted commitment: ${title}`,
    preferenceHints: {
      suppressTeams: true,
    },
    isUserOnRelatedPage: true,
  });
}

export async function previewCreateRFI(
  userId: string,
  options: ActionToolsOptions,
  input: CreateRFIPreviewInput,
): Promise<unknown> {
  const guardrails = createToolGuardrails(userId, {
    pinnedProjectId: options.pinnedProjectId,
  });
  const access = await guardrails.enforceProjectAccess(input.projectId);
  const traceInput = {
    ...input,
    confirmed: false,
  };

  if (!access.ok) {
    const output = { success: false, error: access.error };
    options.onTrace?.({
      tool: "createRFI",
      input: traceInput,
      output,
      timestamp: new Date().toISOString(),
    });
    return output;
  }

  const fields = {
    project_id: input.projectId,
    subject: input.subject,
    question: input.question,
    ball_in_court: input.ballInCourt,
    due_date: input.dueDate,
    cost_impact: input.costImpact ?? "tbd",
    schedule_impact: input.scheduleImpact ?? "tbd",
    status: "open",
    is_private: false,
  };

  await notifyRfiReviewNeeded(userId, {
    projectId: input.projectId,
    subject: input.subject,
    question: input.question,
    ballInCourt: input.ballInCourt,
    dueDate: input.dueDate,
    costImpact: input.costImpact ?? "tbd",
    scheduleImpact: input.scheduleImpact ?? "tbd",
    eventKey: resolvePreviewEventKey("createRFI", fields),
  });

  const output = {
    action: "preview",
    message: "Here's the RFI I'll create. Reply **confirm** to proceed.",
    preview: {
      table: "rfis",
      fields,
    },
  };

  options.onTrace?.({
    tool: "createRFI",
    input: traceInput,
    output,
    timestamp: new Date().toISOString(),
  });
  return output;
}

type RuntimeReplayAuditRow = {
  response_payload?: unknown;
};

type RuntimeContractNumberRow = {
  contract_number?: string;
};

type RuntimeInsertedRecord = {
  id: string;
  contract_number: string;
  title: string;
  status: string;
};

type RuntimeAuditClient = {
  from: (tableName: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            eq: (column: string, value: string) => {
              order: (
                column: string,
                options: { ascending: boolean },
              ) => {
                limit: (count: number) => {
                  maybeSingle: () => Promise<{
                    data: RuntimeReplayAuditRow | null;
                    error: unknown;
                  }>;
                };
              };
            };
          };
        };
      };
    };
    insert: (payload: Record<string, unknown>) => Promise<{ error: unknown }>;
  };
};

type RuntimeCommitmentReadClient = {
  from: (tableName: string) => {
    select: (columns: string) => {
      eq: (column: string, value: number) => {
        order: (
          column: string,
          options: { ascending: boolean },
        ) => {
          limit: (
            count: number,
          ) => Promise<{ data: RuntimeContractNumberRow[] | null; error: unknown }>;
        };
      };
    };
  };
};

type RuntimeCommitmentWriteClient = {
  from: (tableName: string) => {
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: RuntimeInsertedRecord | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};


export function createActionTools(
  userId: string,
  options: ActionToolsOptions = {},
) {
  const supabase = createServiceClient();
  const writeAuditTable = "ai_tool_write_audits";
  const runtimeAuditClient = supabase as unknown as RuntimeAuditClient;
  const runtimeCommitmentReadClient =
    supabase as unknown as RuntimeCommitmentReadClient;
  const runtimeCommitmentWriteClient =
    supabase as unknown as RuntimeCommitmentWriteClient;
  const guardrails = createToolGuardrails(userId, {
    pinnedProjectId: options.pinnedProjectId,
  });

  function resolveIdempotencyKey(
    toolName: string,
    input: Record<string, unknown>,
  ): string {
    const explicit = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
    if (explicit) return explicit;

    const clone = { ...input };
    delete clone.idempotencyKey;
    return createHash("sha256")
      .update(`${toolName}:${JSON.stringify(clone)}`)
      .digest("hex");
  }

  async function getReplayResponse(
    toolName: string,
    idempotencyKey: string,
  ): Promise<unknown | null> {
    const { data, error } = await runtimeAuditClient
      .from(writeAuditTable)
      .select("response_payload")
      .eq("user_id", userId)
      .eq("tool_name", toolName)
      .eq("idempotency_key", idempotencyKey)
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return null;
    return data?.response_payload ?? null;
  }

  async function recordWriteAudit(params: {
    toolName: string;
    idempotencyKey: string;
    projectId: number | null;
    input: Record<string, unknown>;
    status: "success" | "error";
    response: unknown;
  }): Promise<void> {
    const { error } = await runtimeAuditClient.from(writeAuditTable).insert({
      user_id: userId,
      tool_name: params.toolName,
      idempotency_key: params.idempotencyKey,
      project_id: params.projectId,
      request_payload: params.input,
      response_payload: params.response,
      status: params.status,
    });
    if (error) {
      const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? error);
      throw new Error(`Failed to record AI tool write audit for ${params.toolName}: ${message}`);
    }
  }

  async function enforceProjectWriteAccess(
    projectId?: number,
  ): Promise<{ ok: true; projectId: number | null } | { ok: false; error: string }> {
    const effectiveProjectId =
      typeof projectId === "number" && Number.isFinite(projectId)
        ? projectId
        : await guardrails.applyPinnedProject(undefined);

    if (effectiveProjectId == null) {
      return { ok: true, projectId: null };
    }

    const access = await guardrails.enforceProjectAccess(effectiveProjectId);
    if (!access.ok) {
      return { ok: false, error: access.error };
    }

    return { ok: true, projectId: effectiveProjectId };
  }

  async function resolveScheduleTaskAssignee(
    assignee?: string,
  ): Promise<{ assignee: string | null; assigneePersonId: string | null }> {
    const trimmed = assignee?.trim() || null;
    if (!trimmed) return { assignee: null, assigneePersonId: null };

    const normalized = trimmed.toLowerCase();
    const { data, error } = await supabase
      .from("people")
      .select("id,first_name,last_name,email")
      .limit(2000);

    if (error) {
      throw new Error(`Failed to resolve schedule task assignee: ${error.message}`);
    }

    const matches = (data ?? []).filter((person) => {
      const fullName = [person.first_name, person.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
        .toLowerCase();
      const email = person.email?.trim().toLowerCase() ?? "";
      const firstName = person.first_name?.trim().toLowerCase() ?? "";
      const lastName = person.last_name?.trim().toLowerCase() ?? "";

      return (
        email === normalized ||
        fullName === normalized ||
        (normalized.length >= 3 && (firstName === normalized || lastName === normalized))
      );
    });

    return {
      assignee: trimmed,
      assigneePersonId: matches.length === 1 ? matches[0].id : null,
    };
  }

  async function resolveGeneratedTaskAssignee(
    assignee?: string,
  ): Promise<{
    assigneeName: string | null;
    assigneeEmail: string | null;
    assigneePersonId: string | null;
  }> {
    const trimmed = assignee?.trim() || null;
    if (!trimmed) {
      return { assigneeName: null, assigneeEmail: null, assigneePersonId: null };
    }

    const normalized = trimmed.toLowerCase();
    const { data, error } = await supabase
      .from("people")
      .select("id,first_name,last_name,email")
      .limit(2000);

    if (error) {
      throw new Error(`Failed to resolve task assignee: ${error.message}`);
    }

    const matches = (data ?? []).filter((person) => {
      const fullName = [person.first_name, person.last_name]
        .filter(Boolean)
        .join(" ")
        .trim()
        .toLowerCase();
      const email = person.email?.trim().toLowerCase() ?? "";
      const firstName = person.first_name?.trim().toLowerCase() ?? "";
      const lastName = person.last_name?.trim().toLowerCase() ?? "";

      return (
        email === normalized ||
        fullName === normalized ||
        (normalized.length >= 3 && (firstName === normalized || lastName === normalized))
      );
    });

    const person = matches.length === 1 ? matches[0] : null;
    return {
      assigneeName: person
        ? [person.first_name, person.last_name].filter(Boolean).join(" ").trim() || trimmed
        : trimmed,
      assigneeEmail: person?.email ?? (trimmed.includes("@") ? trimmed : null),
      assigneePersonId: person?.id ?? null,
    };
  }

  async function loadGeneratedTaskForWrite(taskId: string) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id,title,description,status,priority,due_date,project_id,assignee_name,assignee_email,metadata_id")
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load task ${taskId}: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return data;
  }

  function needsConfirmedWriteApproval(input: { confirmed?: boolean }): boolean {
    return input.confirmed === true;
  }

  function normalizeDirectoryText(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  async function findCompanyByName(name: string) {
    const normalized = name.trim();
    const { data, error } = await supabase
      .from("companies")
      .select("id,name,address,city,state,website,contact_phone,is_vendor")
      .ilike("name", normalized)
      .limit(2);

    if (error) {
      throw new Error(`Failed to resolve company "${name}": ${error.message}`);
    }

    return data?.length === 1 ? data[0] : null;
  }

  async function ensureProjectCompanyAssociation(params: {
    projectId: number;
    companyId: string;
    companyType?: z.infer<typeof projectCompanyTypeSchema>;
    emailAddress?: string | null;
  }) {
    const { data: existing, error: existingError } = await supabase
      .from("project_companies")
      .select("id,project_id,company_id,status,company_type,email_address,primary_contact_id")
      .eq("project_id", params.projectId)
      .eq("company_id", params.companyId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Failed to check project company assignment: ${existingError.message}`);
    }

    if (existing) {
      if (existing.status !== "ACTIVE") {
        const { data: reactivated, error: reactivateError } = await supabase
          .from("project_companies")
          .update({
            status: "ACTIVE",
            company_type: params.companyType ?? existing.company_type ?? "VENDOR",
            email_address: params.emailAddress ?? existing.email_address,
          })
          .eq("id", existing.id)
          .select("id,project_id,company_id,status,company_type,email_address,primary_contact_id")
          .single();

        if (reactivateError) {
          throw new Error(`Failed to reactivate project company assignment: ${reactivateError.message}`);
        }
        return { assignment: reactivated, action: "reactivated" as const };
      }

      return { assignment: existing, action: "already_assigned" as const };
    }

    const { data: assignment, error } = await supabase
      .from("project_companies")
      .insert({
        project_id: params.projectId,
        company_id: params.companyId,
        company_type: params.companyType ?? "VENDOR",
        email_address: params.emailAddress ?? null,
        status: "ACTIVE",
      })
      .select("id,project_id,company_id,status,company_type,email_address,primary_contact_id")
      .single();

    if (error) {
      throw new Error(`Failed to assign company to project: ${error.message}`);
    }

    return { assignment, action: "assigned" as const };
  }

  async function findPersonByEmail(email?: string | null) {
    const normalizedEmail = normalizeDirectoryText(email)?.toLowerCase();
    if (!normalizedEmail) return null;

    const { data, error } = await supabase
      .from("people")
      .select("id,first_name,last_name,email,company_id,person_type,status")
      .ilike("email", normalizedEmail)
      .limit(2);

    if (error) {
      throw new Error(`Failed to resolve contact by email: ${error.message}`);
    }

    return data?.length === 1 ? data[0] : null;
  }

  const tools = {

    // -------------------------------------------------------------------------
    // TIER 1 — Core write actions
    // -------------------------------------------------------------------------

    createChangeOrder: tool({
      description:
        "Create a new prime contract change order (PCCO). Use when the user says " +
        "'create a change order', 'add a CO', or describes a scope change that needs " +
        "to be documented as a change order. Always show a preview and ask for " +
        "confirmation before writing. If projectId is unknown, call getPortfolioOverview first.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID — required"),
        contractId: z
          .string()
          .optional()
          .describe(
            "Prime contract ID (uuid) if known — prime_contract_change_orders.contract_id is a uuid FK, never a number",
          ),
        title: z.string().describe("Change order title"),
        totalAmount: z.number().optional().describe("Dollar amount — can be 0 if TBD"),
        status: z
          .enum(["draft", "pending", "submitted", "approved", "rejected", "void"])
          .default("draft")
          .describe("Initial status — defaults to draft"),
        confirmed: z
          .boolean()
          .default(false)
          .describe("Set to true only after user confirms the preview"),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createChangeOrder", options, async (input) => {
        const { projectId, contractId, title, totalAmount, status, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        // Preview mode — return what would be created without writing
        if (!confirmed) {
          return {
            action: "preview",
            message:
              "Here's what I'll create. Reply **confirm** to proceed or tell me what to change.",
            preview: {
              table: "prime_contract_change_orders",
              fields: {
                project_id: projectId,
                contract_id: contractId ?? null,
                title,
                total_amount: totalAmount ?? 0,
                status,
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createChangeOrder", input);
        const replay = await getReplayResponse("createChangeOrder", idempotencyKey);
        if (replay) return replay;

        // Write mode — user confirmed
        const { data, error } = await supabase
          .from("prime_contract_change_orders")
          .insert({
            project_id: projectId,
            contract_id: contractId ?? null,
            title,
            total_amount: totalAmount ?? 0,
            status,
          })
          .select("id, title, total_amount, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createChangeOrder",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Change order **"${title}"** created successfully.`,
          record: data,
          nextSteps: [
            "Attach supporting documents in the Change Orders section",
            "Update the amount once scope is finalized",
            "Submit for approval when ready",
          ],
        };
        await recordWriteAudit({
          toolName: "createChangeOrder",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    createChangeEvent: tool({
      description: renderChangeRequestToolDescription(),
      inputSchema: z.object({
        projectId: z.number().describe("Project ID — required"),
        title: z.string().min(1).describe("Short descriptive title"),
        description: z.string().optional().describe("Detailed description"),
        scope: z
          .string()
          .optional()
          .describe("Native scope such as TBD, In Scope, Out of Scope, or legacy owner_change/design_error aliases."),
        type: z
          .string()
          .optional()
          .describe("Native type such as Owner Change, Design Change, Allowance, Scope Gap, or supported legacy aliases."),
        status: z
          .string()
          .optional()
          .describe("Native status such as Open, Pending Approval, Approved, Rejected, Closed, or Converted."),
        reason: z.string().optional().describe("Optional native reason."),
        origin: z.string().optional().describe("Optional native origin."),
        expectingRevenue: z
          .boolean()
          .optional()
          .describe("Whether revenue is expected. Defaults to true."),
        lineItemRevenueSource: z
          .string()
          .optional()
          .describe("Optional line item revenue calculation mode."),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createChangeEvent", options, async (input) => {
        const normalized = normalizeChangeRequestDraft(input);
        if (!normalized.ok) {
          return {
            success: false,
            error: normalized.error,
            missingFields: normalized.missingFields ?? [],
          };
        }

        const { draft } = normalized;
        const { confirmed } = input;
        const access = await enforceProjectWriteAccess(draft.projectId);
        if (!access.ok) return { success: false, error: access.error };
        const fields = buildChangeRequestPreviewFields(draft);

        if (!confirmed) {
          const eventKey = resolvePreviewEventKey("createChangeEvent", fields);
          await notifyChangeRequestReviewNeeded(userId, {
            projectId: draft.projectId,
            title: draft.title,
            description: draft.description ?? undefined,
            scope: draft.scope,
            type: draft.type,
            status: draft.status,
            eventKey,
          });

          const notificationDecision =
            await recordChangeEventPreviewNotificationDecision({
              userId,
              projectId: draft.projectId,
              title: draft.title,
              eventKey,
            });

          return {
            action: "preview",
            message: "Here's the change request I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "change_events",
              fields,
              reviewCard: buildChangeRequestReviewCard(fields),
            },
            notificationDecision,
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createChangeEvent", input);
        const replay = await getReplayResponse("createChangeEvent", idempotencyKey);
        if (replay) return replay;

        const { data: existing, error: numberError } = await supabase
          .from("change_events")
          .select("number")
          .eq("project_id", draft.projectId);

        if (numberError) {
          const failure = {
            success: false,
            error: `Unable to generate the next change request number: ${numberError.message}`,
          };
          await recordWriteAudit({
            toolName: "createChangeEvent",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const maxNumber = (existing ?? []).reduce((max, row) => {
          const value = typeof row.number === "string" ? row.number : "";
          const parsed = Number.parseInt(value.replace(/\D/g, ""), 10);
          return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
        }, 0);
        const nextNumber = String(maxNumber + 1).padStart(3, "0");

        const { data, error } = await supabase
          .from("change_events")
          .insert({
            project_id: draft.projectId,
            title: draft.title,
            description: draft.description,
            scope: draft.scope,
            type: draft.type,
            status: draft.status,
            reason: draft.reason,
            origin: draft.origin,
            number: nextNumber,
            expecting_revenue: draft.expectingRevenue,
            line_item_revenue_source: draft.lineItemRevenueSource,
            updated_at: new Date().toISOString(),
          })
          .select("id, title, number, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createChangeEvent",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Change request **${data.number} — "${draft.title}"** logged.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "createChangeEvent",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    updateProjectStatus: tool({
      description:
        "Update a project's health status or phase. Use when the user says " +
        "'mark [project] as at-risk', 'update status to [value]', or " +
        "'[project] is now in [phase]'. Always confirm before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        healthStatus: z
          .enum(["on_track", "at_risk", "critical", "complete", "on_hold"])
          .optional()
          .describe("New health status"),
        phase: z
          .enum(["Estimating", "Planning", "Current", "Complete", "On Hold"])
          .optional()
          .describe("New project phase"),
        reason: z.string().optional().describe("Brief reason for the status change"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("updateProjectStatus", options, async (input) => {
        const { projectId, healthStatus, phase, reason, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!healthStatus && !phase) {
          return { error: "Provide at least one of healthStatus or phase to update." };
        }

        const updates: Record<string, string> = {};
        if (healthStatus) updates.health_status = healthStatus;
        if (phase) updates.phase = phase;

        if (!confirmed) {
          return {
            action: "preview",
            message: `I'll update project ${projectId} with these changes. Reply **confirm** to proceed.`,
            preview: { table: "projects", id: projectId, updates, reason },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("updateProjectStatus", input);
        const replay = await getReplayResponse("updateProjectStatus", idempotencyKey);
        if (replay) return replay;

        const { data, error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", projectId)
          .select("id, name, health_status, phase")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "updateProjectStatus",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Project **${data.name}** updated.`,
          changes: updates,
          reason: reason ?? null,
        };
        await recordWriteAudit({
          toolName: "updateProjectStatus",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    createRFI: tool({
      description:
        "Create a new Request for Information (RFI). Use when the user says " +
        "'create an RFI', 'log an RFI about [topic]', or describes a field " +
        "question that needs a formal answer from the design team. Preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        subject: z.string().describe("RFI subject / title"),
        question: z.string().describe("The actual question being asked"),
        ballInCourt: z.string().optional().describe("Who is responsible for answering"),
        dueDate: z.string().optional().describe("ISO date string for response due date"),
        costImpact: z.enum(["yes", "no", "tbd"]).optional().default("tbd"),
        scheduleImpact: z.enum(["yes", "no", "tbd"]).optional().default("tbd"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createRFI", options, async (input) => {
        const { projectId, subject, question, ballInCourt, dueDate, costImpact, scheduleImpact, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the RFI I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "rfis",
              fields: { project_id: projectId, subject, question, ball_in_court: ballInCourt, due_date: dueDate, cost_impact: costImpact, schedule_impact: scheduleImpact, status: "open", is_private: false },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createRFI", input);
        const replay = await getReplayResponse("createRFI", idempotencyKey);
        if (replay) return replay;

        // Get next RFI number for this project
        const { data: existing } = await supabase
          .from("rfis")
          .select("number")
          .eq("project_id", projectId)
          .order("number", { ascending: false })
          .limit(1);
        const nextNumber = (existing?.[0]?.number ?? 0) + 1;

        const { data, error } = await supabase
          .from("rfis")
          .insert({
            project_id: projectId,
            subject,
            question,
            ball_in_court: ballInCourt ?? null,
            due_date: dueDate ?? null,
            cost_impact: costImpact ?? "tbd",
            schedule_impact: scheduleImpact ?? "tbd",
            status: "open",
            is_private: false,
            number: nextNumber,
            updated_at: new Date().toISOString(),
          })
          .select("id, number, subject, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createRFI",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `RFI #${data.number} — **"${subject}"** created.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "createRFI",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    createTask: tool({
      description:
        "Create a schedule/Gantt task backed by schedule_tasks. Use only when the user is creating " +
        "a project schedule activity, milestone, or Gantt item. For action items, follow-ups, reminders, " +
        "or Tasks page records, use createGeneratedTask instead. Always show a preview and ask for confirmation before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        name: z.string().describe("Task name / description"),
        assignee: z.string().optional().describe("Person responsible"),
        dueDate: z.string().optional().describe("ISO due date"),
        notes: z.string().optional().describe("Additional context"),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createTask", options, async (input) => {
        const { projectId, name, assignee, dueDate, notes, priority, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const resolvedAssignee = await resolveScheduleTaskAssignee(assignee);

        if (!confirmed) {
          let fewShotBlock = "";
          try {
            fewShotBlock = await buildTaskFewShotBlock(projectId);
          } catch (error) {
            options.onTrace?.({
              tool: "createTask",
              input: { projectId, name, confirmed: false },
              output: {
                warning: "Task training examples could not be loaded.",
                error: error instanceof Error ? error.message : String(error),
              },
              timestamp: new Date().toISOString(),
            });
          }

          return {
            action: "preview",
            message: `Here's the task I'll create. Reply **confirm** to proceed.${fewShotBlock}`,
            preview: {
              table: "schedule_tasks",
              fields: {
                project_id: projectId,
                name: notes ? `${name} — ${notes}` : name,
                status: "not_started",
                finish_date: dueDate ?? null,
                assignee: resolvedAssignee.assignee,
                assignee_person_id: resolvedAssignee.assigneePersonId,
                priority,
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createTask", input);
        const replay = await getReplayResponse("createTask", idempotencyKey);
        if (replay) return replay;

        const { data, error } = await supabase
          .from("schedule_tasks")
          .insert({
            project_id: projectId,
            name: notes ? `${name} — ${notes}` : name,
            status: "not_started",
            percent_complete: 0,
            finish_date: dueDate ?? null,
            assignee: resolvedAssignee.assignee,
            assignee_person_id: resolvedAssignee.assigneePersonId,
            priority,
            updated_at: new Date().toISOString(),
          })
          .select("id, name, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createTask",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Task **"${name}"** created${assignee ? ` — assigned to ${assignee}` : ""}.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "createTask",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    createGeneratedTask: tool({
      description:
        "Create an action item in the main Tasks page task register (public.tasks). " +
        "Use this for AI-generated follow-ups, reminders, accountability items, or user-created action items " +
        "that should appear on /tasks or /[projectId]/tasks. If the action item supports a known schedule/Gantt task, pass scheduleTaskId to link it. Preview before writing.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if the task belongs to a project"),
        scheduleTaskId: z
          .string()
          .uuid()
          .optional()
          .describe("Optional schedule_tasks.id when this action item supports a specific schedule/Gantt activity"),
        title: z.string().describe("Short task title"),
        description: z.string().optional().describe("Task detail or source context"),
        assignee: z.string().optional().describe("Person responsible"),
        dueDate: z.string().optional().describe("ISO due date"),
        priority: generatedTaskPrioritySchema.default("normal"),
        status: generatedTaskStatusSchema.default("open"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createGeneratedTask", options, async (input) => {
        const { projectId, scheduleTaskId, title, description, assignee, dueDate, priority, status, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };
        const effectiveProjectId = access.projectId;
        const resolvedAssignee = await resolveGeneratedTaskAssignee(assignee);
        const taskDescription = description?.trim() || title;
        const normalizedPriority = normalizeGeneratedTaskPriority(priority);
        const normalizedStatus = normalizeGeneratedTaskStatus(status);

        if (!confirmed) {
          return {
            action: "preview",
            message:
              "Here's the task I'll add to the Tasks page. Reply **confirm** to proceed.",
            preview: {
              table: "tasks",
              fields: {
                project_id: effectiveProjectId,
                schedule_task_id: scheduleTaskId ?? null,
                title,
                description: taskDescription,
                status: normalizedStatus,
                due_date: dueDate ?? null,
                priority: normalizedPriority,
                assignee_name: resolvedAssignee.assigneeName,
                assignee_email: resolvedAssignee.assigneeEmail,
                assignee_person_id: resolvedAssignee.assigneePersonId,
                source_system: "ai_assistant",
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createGeneratedTask", input);
        const replay = await getReplayResponse("createGeneratedTask", idempotencyKey);
        if (replay) return replay;

        const metadataId = randomUUID();
        const { data, error } = await supabase
          .rpc("create_ai_generated_task", {
            p_metadata_id: metadataId,
            p_title: title,
            p_description: taskDescription,
            p_status: normalizedStatus,
            p_due_date: dueDate,
            p_priority: normalizedPriority,
            p_project_id: effectiveProjectId ?? undefined,
            p_assignee_name: resolvedAssignee.assigneeName ?? undefined,
            p_assignee_email: resolvedAssignee.assigneeEmail ?? undefined,
            p_assignee_person_id: resolvedAssignee.assigneePersonId ?? undefined,
            p_user_id: userId,
            p_idempotency_key: idempotencyKey,
            p_schedule_task_id: scheduleTaskId ?? undefined,
          });

        if (error) {
          const failure = {
            success: false,
            error: error.message,
          };
          await recordWriteAudit({
            toolName: "createGeneratedTask",
            idempotencyKey,
            projectId: effectiveProjectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Task **"${title}"** was added to the Tasks page.`,
          record: data,
          links: {
            tasksPage: effectiveProjectId ? `/${effectiveProjectId}/tasks?task=${data.id}` : `/tasks?task=${data.id}`,
          },
        };
        await recordWriteAudit({
          toolName: "createGeneratedTask",
          idempotencyKey,
          projectId: effectiveProjectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    createProjectCompany: tool({
      description:
        "Add a company to a project's directory. Use when the user says 'add [company] to this project', " +
        "'add a vendor/subcontractor/supplier', or provides company directory details. Reuses an existing global company by exact name when possible, assigns it to the project, and previews before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        name: z.string().describe("Company name"),
        companyType: projectCompanyTypeSchema.default("VENDOR"),
        emailAddress: z.string().email().optional().describe("Project directory email for the company"),
        businessPhone: z.string().optional().describe("Company business phone"),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        website: z.string().optional(),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createProjectCompany", options, async (input) => {
        const access = await enforceProjectWriteAccess(input.projectId);
        if (!access.ok) return { success: false, error: access.error };

        const companyName = normalizeDirectoryText(input.name);
        if (!companyName) {
          return { success: false, error: "Company name is required." };
        }

        const normalized = {
          name: companyName,
          companyType: input.companyType,
          emailAddress: normalizeDirectoryText(input.emailAddress),
          businessPhone: normalizeDirectoryText(input.businessPhone),
          address: normalizeDirectoryText(input.address),
          city: normalizeDirectoryText(input.city),
          state: normalizeDirectoryText(input.state),
          zip: normalizeDirectoryText(input.zip),
          website: normalizeDirectoryText(input.website),
        };

        if (!input.confirmed) {
          return {
            action: "preview",
            message:
              "Here's the company I'll add to the project directory. Reply **confirm** to proceed.",
            preview: {
              tables: ["companies", "project_companies"],
              fields: {
                project_id: input.projectId,
                name: normalized.name,
                company_type: normalized.companyType,
                email_address: normalized.emailAddress,
                contact_phone: normalized.businessPhone,
                address: normalized.address,
                city: normalized.city,
                state: normalized.state,
                zip_code: normalized.zip,
                website: normalized.website,
                status: "ACTIVE",
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createProjectCompany", input);
        const replay = await getReplayResponse("createProjectCompany", idempotencyKey);
        if (replay) return replay;

        try {
          const existingCompany = await findCompanyByName(normalized.name);
          let company = existingCompany;

          if (!company) {
            const { data, error } = await supabase
              .from("companies")
              .insert({
                name: normalized.name,
                address: normalized.address,
                city: normalized.city,
                state: normalized.state,
                zip_code: normalized.zip,
                contact_phone: normalized.businessPhone,
                contact_email: normalized.emailAddress,
                website: normalized.website,
                is_vendor: normalized.companyType !== "YOUR_COMPANY",
                status: "active",
                type: normalized.companyType,
              })
              .select("id,name,address,city,state,website,contact_phone,is_vendor")
              .single();

            if (error) {
              throw new Error(`Failed to create company: ${error.message}`);
            }
            company = data;
          }

          const assignmentResult = await ensureProjectCompanyAssociation({
            projectId: input.projectId,
            companyId: company.id,
            companyType: normalized.companyType,
            emailAddress: normalized.emailAddress,
          });

          const response = {
            success: true,
            message:
              assignmentResult.action === "already_assigned"
                ? `Company **${company.name}** was already active on this project.`
                : `Company **${company.name}** was added to the project directory.`,
            record: {
              company,
              projectCompany: assignmentResult.assignment,
              companyAction: existingCompany ? "reused_existing_company" : "created_company",
              assignmentAction: assignmentResult.action,
            },
            links: {
              projectDirectory: `/${input.projectId}/directory`,
              companyDirectory: "/directory/companies",
            },
          };
          await recordWriteAudit({
            toolName: "createProjectCompany",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "success",
            response,
          });
          return response;
        } catch (error) {
          const failure = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
          await recordWriteAudit({
            toolName: "createProjectCompany",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }
      }),
    }),

    createProjectContact: tool({
      description:
        "Add a contact to a project's directory. Use when the user says 'add [person] as a contact', " +
        "'add this vendor contact to the project', or provides contact details. Reuses an existing person by email, links them to the project directory, optionally links their company, and previews before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        firstName: z.string().describe("Contact first name"),
        lastName: z.string().describe("Contact last name"),
        email: z.string().email().optional(),
        jobTitle: z.string().optional(),
        phoneBusiness: z.string().optional(),
        phoneMobile: z.string().optional(),
        companyId: z.string().uuid().optional().describe("Existing companies.id if known"),
        companyName: z.string().optional().describe("Existing company name to link by exact name"),
        role: z.string().optional().describe("Project-specific role, e.g. Architect, Owner Rep, Electrical PM"),
        makePrimaryCompanyContact: z.boolean().default(false),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createProjectContact", options, async (input) => {
        const access = await enforceProjectWriteAccess(input.projectId);
        if (!access.ok) return { success: false, error: access.error };

        const firstName = normalizeDirectoryText(input.firstName);
        const lastName = normalizeDirectoryText(input.lastName);
        if (!firstName || !lastName) {
          return { success: false, error: "First name and last name are required." };
        }

        const normalized = {
          firstName,
          lastName,
          email: normalizeDirectoryText(input.email),
          jobTitle: normalizeDirectoryText(input.jobTitle),
          phoneBusiness: normalizeDirectoryText(input.phoneBusiness),
          phoneMobile: normalizeDirectoryText(input.phoneMobile),
          companyName: normalizeDirectoryText(input.companyName),
          role: normalizeDirectoryText(input.role),
        };

        if (!input.confirmed) {
          return {
            action: "preview",
            message:
              "Here's the contact I'll add to the project directory. Reply **confirm** to proceed.",
            preview: {
              tables: ["people", "project_directory_memberships", "project_companies"],
              fields: {
                project_id: input.projectId,
                first_name: normalized.firstName,
                last_name: normalized.lastName,
                email: normalized.email,
                job_title: normalized.jobTitle,
                phone_business: normalized.phoneBusiness,
                phone_mobile: normalized.phoneMobile,
                company_id: input.companyId ?? null,
                company_name: normalized.companyName,
                role: normalized.role,
                person_type: "contact",
                status: "active",
                make_primary_company_contact: input.makePrimaryCompanyContact,
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createProjectContact", input);
        const replay = await getReplayResponse("createProjectContact", idempotencyKey);
        if (replay) return replay;

        try {
          let companyId = input.companyId ?? null;
          let companyName = normalized.companyName;
          if (!companyId && normalized.companyName) {
            const company = await findCompanyByName(normalized.companyName);
            if (!company) {
              throw new Error(`Company "${normalized.companyName}" was not found. Add the company first, then add the contact.`);
            }
            companyId = company.id;
            companyName = company.name;
          }

          let projectCompany = null;
          if (companyId) {
            const association = await ensureProjectCompanyAssociation({
              projectId: input.projectId,
              companyId,
              companyType: "VENDOR",
              emailAddress: null,
            });
            projectCompany = association.assignment;
          }

          const existingPerson = await findPersonByEmail(normalized.email);
          let person = existingPerson;

          if (person) {
            const updates: Record<string, unknown> = {
              status: "active",
              person_type: person.person_type || "contact",
            };
            if (companyId && person.company_id !== companyId) updates.company_id = companyId;
            if (normalized.jobTitle) updates.job_title = normalized.jobTitle;
            if (normalized.phoneBusiness) updates.phone_business = normalized.phoneBusiness;
            if (normalized.phoneMobile) updates.phone_mobile = normalized.phoneMobile;

            const { data, error } = await supabase
              .from("people")
              .update(updates)
              .eq("id", person.id)
              .select("id,first_name,last_name,email,company_id,person_type,status,job_title,phone_business,phone_mobile")
              .single();

            if (error) {
              throw new Error(`Failed to update existing contact: ${error.message}`);
            }
            person = data;
          } else {
            const { data, error } = await supabase
              .from("people")
              .insert({
                first_name: normalized.firstName,
                last_name: normalized.lastName,
                email: normalized.email,
                job_title: normalized.jobTitle,
                phone_business: normalized.phoneBusiness,
                phone_mobile: normalized.phoneMobile,
                company_id: companyId,
                company: companyName,
                person_type: "contact",
                status: "active",
              })
              .select("id,first_name,last_name,email,company_id,person_type,status,job_title,phone_business,phone_mobile")
              .single();

            if (error) {
              throw new Error(`Failed to create contact: ${error.message}`);
            }
            person = data;
          }

          const { data: existingMembership, error: existingMembershipError } = await supabase
            .from("project_directory_memberships")
            .select("id,project_id,person_id,role,status,user_type,invite_status")
            .eq("project_id", input.projectId)
            .eq("person_id", person.id)
            .maybeSingle();

          if (existingMembershipError) {
            throw new Error(`Failed to check project contact membership: ${existingMembershipError.message}`);
          }

          let membership = existingMembership;
          let membershipAction: "created" | "reactivated" | "already_assigned" = "already_assigned";
          if (existingMembership) {
            if (existingMembership.status !== "active" || (normalized.role && existingMembership.role !== normalized.role)) {
              const { data, error } = await supabase
                .from("project_directory_memberships")
                .update({
                  status: "active",
                  role: normalized.role ?? existingMembership.role,
                  user_type: existingMembership.user_type || "contact",
                  invite_status: "accepted",
                })
                .eq("id", existingMembership.id)
                .select("id,project_id,person_id,role,status,user_type,invite_status")
                .single();

              if (error) {
                throw new Error(`Failed to reactivate project contact membership: ${error.message}`);
              }
              membership = data;
              membershipAction = "reactivated";
            }
          } else {
            const { data, error } = await supabase
              .from("project_directory_memberships")
              .insert({
                project_id: input.projectId,
                person_id: person.id,
                role: normalized.role,
                status: "active",
                user_type: "contact",
                invite_status: "accepted",
              })
              .select("id,project_id,person_id,role,status,user_type,invite_status")
              .single();

            if (error) {
              throw new Error(`Failed to add contact to project directory: ${error.message}`);
            }
            membership = data;
            membershipAction = "created";
          }

          let primaryContactUpdated = false;
          if (input.makePrimaryCompanyContact && projectCompany) {
            const { error } = await supabase
              .from("project_companies")
              .update({ primary_contact_id: person.id })
              .eq("id", projectCompany.id);

            if (error) {
              throw new Error(`Failed to set primary company contact: ${error.message}`);
            }
            primaryContactUpdated = true;
          }

          const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ");
          const response = {
            success: true,
            message:
              membershipAction === "already_assigned"
                ? `Contact **${fullName}** was already active on this project.`
                : `Contact **${fullName}** was added to the project directory.`,
            record: {
              person,
              membership,
              projectCompany,
              personAction: existingPerson ? "reused_existing_person" : "created_person",
              membershipAction,
              primaryContactUpdated,
            },
            links: {
              projectDirectory: `/${input.projectId}/directory`,
              contactDirectory: "/directory/contacts",
            },
          };
          await recordWriteAudit({
            toolName: "createProjectContact",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "success",
            response,
          });
          return response;
        } catch (error) {
          const failure = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
          await recordWriteAudit({
            toolName: "createProjectContact",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }
      }),
    }),

    createContact: tool({
      description:
        "Create a contact in the global directory (public.people). Use when the user wants to 'add a contact', " +
        "'create a new contact', or 'add [person] to the directory' WITHOUT tying them to a specific project " +
        "(use createProjectContact when a project is involved). This renders an interactive, prefilled contact " +
        "form widget: fill in every field you already know (first/last name, email, phone, job title, company, " +
        "department, notes) so the user only completes what's missing, then submits. Reuses an existing person by " +
        "email and links the company by id or exact name. Always previews the form before writing.",
      inputSchema: z.object({
        firstName: z.string().describe("Contact first name"),
        lastName: z.string().describe("Contact last name"),
        email: z.string().email().optional().describe("Contact email; used to de-duplicate existing people"),
        phone: z.string().optional().describe("Primary phone number (stored as phone_mobile)"),
        jobTitle: z.string().optional().describe("Job title, e.g. Project Manager"),
        department: z.string().optional().describe("Department / business unit, e.g. Operations"),
        companyId: z.string().uuid().optional().describe("Existing companies.id when known"),
        companyName: z.string().optional().describe("Company name to link by exact match when companyId is unknown"),
        notes: z.string().optional().describe("Freeform relationship notes"),
        confirmed: z.boolean().default(false).describe("Set to true only after the user submits the form"),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createContact", options, async (input) => {
        const firstName = normalizeDirectoryText(input.firstName);
        const lastName = normalizeDirectoryText(input.lastName);
        if (!firstName || !lastName) {
          return { success: false, error: "First name and last name are required." };
        }

        const normalized = {
          firstName,
          lastName,
          email: normalizeDirectoryText(input.email),
          phone: normalizeDirectoryText(input.phone),
          jobTitle: normalizeDirectoryText(input.jobTitle),
          department: normalizeDirectoryText(input.department),
          companyName: normalizeDirectoryText(input.companyName),
          notes: normalizeDirectoryText(input.notes),
        };

        const buildWidget = (
          status: "draft" | "created",
          extra: { companyId?: string | null; contactHref?: string | null },
        ) => ({
          type: "create_contact" as const,
          id: status === "created" ? "create-contact-created" : "create-contact-preview",
          title: "Create contact",
          status,
          defaultFirstName: normalized.firstName,
          defaultLastName: normalized.lastName,
          defaultEmail: normalized.email ?? undefined,
          defaultPhone: normalized.phone ?? undefined,
          defaultJobTitle: normalized.jobTitle ?? undefined,
          defaultDepartment: normalized.department ?? undefined,
          defaultCompanyName: normalized.companyName ?? undefined,
          defaultNotes: normalized.notes ?? undefined,
          companyId: extra.companyId ?? input.companyId ?? null,
          contactHref: extra.contactHref ?? null,
          confirmPrompt:
            "Create this contact in the directory with createContact (confirmed). Show the final form first and wait for my confirmation.",
        });

        if (!input.confirmed) {
          return {
            action: "preview",
            message:
              "Here's the contact I'll add to the directory. Edit any field, then submit to create it.",
            preview: {
              table: "people",
              fields: {
                first_name: normalized.firstName,
                last_name: normalized.lastName,
                email: normalized.email,
                phone_mobile: normalized.phone,
                job_title: normalized.jobTitle,
                business_unit: normalized.department,
                company_id: input.companyId ?? null,
                company: normalized.companyName,
                notes: normalized.notes,
                person_type: "contact",
                status: "active",
              },
            },
            widget: buildWidget("draft", {}),
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createContact", input);
        const replay = await getReplayResponse("createContact", idempotencyKey);
        if (replay) return replay;

        try {
          let companyId = input.companyId ?? null;
          let companyName = normalized.companyName;
          let companyMatched = Boolean(companyId);
          if (!companyId && normalized.companyName) {
            const company = await findCompanyByName(normalized.companyName);
            if (company) {
              companyId = company.id;
              companyName = company.name;
              companyMatched = true;
            }
          }

          const existingPerson = await findPersonByEmail(normalized.email);
          let person = existingPerson;

          if (person) {
            const updates: Record<string, unknown> = {
              status: "active",
              person_type: person.person_type || "contact",
            };
            if (companyId && person.company_id !== companyId) updates.company_id = companyId;
            if (companyName) updates.company = companyName;
            if (normalized.jobTitle) updates.job_title = normalized.jobTitle;
            if (normalized.phone) updates.phone_mobile = normalized.phone;
            if (normalized.department) updates.business_unit = normalized.department;
            if (normalized.notes) updates.notes = normalized.notes;

            const { data, error } = await supabase
              .from("people")
              .update(updates)
              .eq("id", person.id)
              .select("id,first_name,last_name,email,company_id,company,person_type,status,job_title,business_unit,phone_mobile,notes")
              .single();

            if (error) {
              throw new Error(`Failed to update existing contact: ${error.message}`);
            }
            person = data;
          } else {
            const { data, error } = await supabase
              .from("people")
              .insert({
                first_name: normalized.firstName,
                last_name: normalized.lastName,
                email: normalized.email,
                phone_mobile: normalized.phone,
                job_title: normalized.jobTitle,
                business_unit: normalized.department,
                notes: normalized.notes,
                company_id: companyId,
                company: companyName,
                person_type: "contact",
                status: "active",
              })
              .select("id,first_name,last_name,email,company_id,company,person_type,status,job_title,business_unit,phone_mobile,notes")
              .single();

            if (error) {
              throw new Error(`Failed to create contact: ${error.message}`);
            }
            person = data;
          }

          const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ");
          const contactHref = `/directory/contacts/${person.id}`;
          const unmatchedCompanyNote =
            !companyMatched && normalized.companyName
              ? ` I kept the company name "${normalized.companyName}" on the record but couldn't match it to an existing company — add the company to link it.`
              : "";
          const response = {
            success: true,
            message:
              (existingPerson
                ? `Contact **${fullName}** already existed, so I updated their details.`
                : `Contact **${fullName}** was added to the directory.`) + unmatchedCompanyNote,
            record: {
              person,
              personAction: existingPerson ? "reused_existing_person" : "created_person",
              companyMatched,
            },
            links: {
              contact: contactHref,
              contactDirectory: "/directory/contacts",
            },
            widget: buildWidget("created", { companyId, contactHref }),
          };
          await recordWriteAudit({
            toolName: "createContact",
            idempotencyKey,
            projectId: null,
            input,
            status: "success",
            response,
          });
          return response;
        } catch (error) {
          const failure = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
          await recordWriteAudit({
            toolName: "createContact",
            idempotencyKey,
            projectId: null,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }
      }),
    }),

    updateGeneratedTask: tool({
      description:
        "Update an existing task in the main Tasks page task register (public.tasks). " +
        "Use when the user asks to modify, reassign, reprioritize, close, or change a due date for a Tasks page item. Preview before writing.",
      inputSchema: z.object({
        taskId: z.string().uuid().describe("Task ID from public.tasks"),
        title: z.string().optional(),
        description: z.string().optional(),
        assignee: z.string().optional(),
        dueDate: z.string().nullable().optional(),
        priority: generatedTaskPrioritySchema.optional(),
        status: generatedTaskStatusSchema.optional(),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("updateGeneratedTask", options, async (input) => {
        const current = await loadGeneratedTaskForWrite(input.taskId);
        if (!current) return { success: false, error: "Task was not found in the Tasks table." };
        const access = await enforceProjectWriteAccess(current.project_id ?? undefined);
        if (!access.ok) return { success: false, error: access.error };

        const resolvedAssignee =
          input.assignee !== undefined
            ? await resolveGeneratedTaskAssignee(input.assignee)
            : null;
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (input.title !== undefined) updates.title = input.title;
        if (input.description !== undefined) updates.description = input.description;
        if (input.status !== undefined) updates.status = normalizeGeneratedTaskStatus(input.status);
        if (input.priority !== undefined) updates.priority = normalizeGeneratedTaskPriority(input.priority);
        if (input.dueDate !== undefined) updates.due_date = input.dueDate || null;
        if (resolvedAssignee) {
          updates.assignee_name = resolvedAssignee.assigneeName;
          updates.assignee_email = resolvedAssignee.assigneeEmail;
          updates.assignee_person_id = resolvedAssignee.assigneePersonId;
        }

        if (Object.keys(updates).length === 1) {
          return { success: false, error: "No task fields were provided to update." };
        }

        if (!input.confirmed) {
          return {
            action: "preview",
            message:
              "Here's the Tasks page item I'll update. Reply **confirm** to proceed.",
            preview: {
              table: "tasks",
              id: input.taskId,
              current,
              updates,
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("updateGeneratedTask", input);
        const replay = await getReplayResponse("updateGeneratedTask", idempotencyKey);
        if (replay) return replay;

        const { data, error } = await supabase
          .from("tasks")
          .update(updates)
          .eq("id", input.taskId)
          .select("id,title,description,status,priority,due_date,project_id,assignee_name,assignee_email,updated_at")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "updateGeneratedTask",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Task **"${data.title ?? data.description}"** was updated.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "updateGeneratedTask",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    deleteGeneratedTask: tool({
      description:
        "Delete an existing task from the main Tasks page task register (public.tasks). Preview before writing.",
      inputSchema: z.object({
        taskId: z.string().uuid().describe("Task ID from public.tasks"),
        reason: z.string().optional().describe("Why the task should be deleted"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("deleteGeneratedTask", options, async (input) => {
        const current = await loadGeneratedTaskForWrite(input.taskId);
        if (!current) return { success: false, error: "Task was not found in the Tasks table." };
        const access = await enforceProjectWriteAccess(current.project_id ?? undefined);
        if (!access.ok) return { success: false, error: access.error };

        if (!input.confirmed) {
          return {
            action: "preview",
            message:
              "Here's the Tasks page item I'll delete. Reply **confirm** to proceed.",
            preview: {
              table: "tasks",
              id: input.taskId,
              current,
              reason: input.reason ?? null,
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("deleteGeneratedTask", input);
        const replay = await getReplayResponse("deleteGeneratedTask", idempotencyKey);
        if (replay) return replay;

        const { error } = await supabase.from("tasks").delete().eq("id", input.taskId);

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "deleteGeneratedTask",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Task **"${current.title ?? current.description}"** was deleted from the Tasks page.`,
          deletedTask: current,
          reason: input.reason ?? null,
        };
        await recordWriteAudit({
          toolName: "deleteGeneratedTask",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 2 — Document & status updates
    // -------------------------------------------------------------------------

    flagProjectRisk: tool({
      description:
        "Flag a project risk or insight. Use when the user says 'flag a risk', " +
        "'log an issue', or 'mark this as a concern'. Creates an AI insight record " +
        "that shows up in the risk dashboard. Preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        title: z.string().describe("Risk title — short, specific"),
        description: z.string().describe("Full description of the risk"),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        insightType: z
          .enum(["financial_risk", "schedule_risk", "scope_risk", "team_risk", "client_risk", "general"])
          .default("general"),
        financialImpact: z.number().optional().describe("Estimated dollar impact"),
        timelineImpactDays: z.number().optional().describe("Estimated schedule impact in days"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("flagProjectRisk", options, async (input) => {
        const { projectId, title, description, severity, insightType, financialImpact, timelineImpactDays, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        const cardType = mapLegacyInsightTypeToCardType(insightType);
        const confidence = severityToConfidence(severity);
        const nowIso = new Date().toISOString();
        const cardMetadata = {
          severity_input: severity,
          insight_type_input: insightType,
          financial_impact: financialImpact ?? null,
          timeline_impact_days: timelineImpactDays ?? null,
          flagged_by: "ai_assistant",
        };

        if (!confirmed) {
          return {
            action: "preview",
            message: "I'll log this risk. Reply **confirm** to proceed.",
            preview: {
              table: "insight_cards",
              fields: {
                project_id: projectId,
                title,
                summary: description,
                card_type: cardType,
                confidence,
                current_status: "open",
                attribution_status: "auto_assigned",
                metadata: cardMetadata,
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("flagProjectRisk", input);
        const replay = await getReplayResponse("flagProjectRisk", idempotencyKey);
        if (replay) return replay;

        // Resolve project_id → intelligence_targets.id (Pipeline B keys cards by target UUID).
        const targetMap = await resolveTargetIdsForProjects(supabase, [projectId]);
        const targetId = targetMap.get(projectId);
        if (!targetId) {
          const failure = {
            success: false,
            error: `No active intelligence target exists for project ${projectId}. Ask an admin to bootstrap the project's intelligence target before flagging risks.`,
          };
          await recordWriteAudit({
            toolName: "flagProjectRisk",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const { data, error } = await supabase
          .from("insight_cards")
          .insert({
            primary_target_id: targetId,
            card_type: cardType,
            title,
            summary: description,
            why_it_matters: null,
            current_status: "open",
            confidence,
            attribution_status: "auto_assigned",
            next_action: null,
            suggested_owner_label: null,
            first_seen_at: nowIso,
            last_seen_at: nowIso,
            source_count: 1,
            compiler_version: "manual_user_flag_v1",
            metadata: cardMetadata as unknown as Json,
          })
          .select("id, title, card_type")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "flagProjectRisk",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `Risk **"${title}"** flagged as ${severity}.`,
          record: { id: data.id, title: data.title, card_type: data.card_type, severity },
        };
        await recordWriteAudit({
          toolName: "flagProjectRisk",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    updateRFIStatus: tool({
      description:
        "Update the status of an existing RFI. Use when the user says " +
        "'close RFI #[n]', 'mark RFI [n] as answered', or 'RFI [n] is resolved'. " +
        "Always preview before writing.",
      inputSchema: z.object({
        rfiId: z.string().optional().describe("RFI UUID if known"),
        rfiNumber: z.number().optional().describe("RFI number (easier to get from user)"),
        projectId: z.number().describe("Project ID — needed to look up by number"),
        newStatus: z.enum(["open", "answered", "closed", "void"]).describe("New status"),
        response: z.string().optional().describe("Optional response text to record"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("updateRFIStatus", options, async (input) => {
        const { rfiId, rfiNumber, projectId, newStatus, response, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "I'll update this RFI status. Reply **confirm** to proceed.",
            preview: {
              table: "rfis",
              fields: { rfiId: rfiId ?? null, rfiNumber: rfiNumber ?? null, projectId, status: newStatus },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("updateRFIStatus", input);
        const replay = await getReplayResponse("updateRFIStatus", idempotencyKey);
        if (replay) return replay;

        let targetId = rfiId;
        if (!targetId && rfiNumber) {
          const { data } = await supabase
            .from("rfis")
            .select("id")
            .eq("project_id", projectId)
            .eq("number", rfiNumber)
            .single();
          targetId = data?.id;
        }

        if (!targetId) return { error: "Could not find RFI — provide rfiId or rfiNumber + projectId" };

        const updates: Record<string, unknown> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === "closed" || newStatus === "answered") {
          updates.closed_date = new Date().toISOString().split("T")[0];
        }

        const { data, error } = await supabase
          .from("rfis")
          .update(updates)
          .eq("id", targetId)
          .select("id, number, subject, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "updateRFIStatus",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const successResponse = {
          success: true,
          message: `RFI #${data.number} — **"${data.subject}"** marked as ${newStatus}.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "updateRFIStatus",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: successResponse,
        });
        return successResponse;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 2 (continued) — Document & operational actions
    // -------------------------------------------------------------------------

    createMeetingNote: tool({
      description:
        "Log notes from a meeting into the project record. Use when the user says " +
        "'log notes from today's meeting', 'record what we discussed', or " +
        "'save meeting notes for [project]'. Can pre-fill from Fireflies context if available. " +
        "Always preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        title: z.string().describe("Meeting title, e.g. 'OAC Meeting — March 2026'"),
        date: z.string().describe("ISO date string, e.g. '2026-03-23'"),
        summary: z.string().describe("Summary of what was discussed"),
        actionItems: z.string().optional().describe("Comma-separated action items from the meeting"),
        participants: z.string().optional().describe("Comma-separated list of attendees"),
        durationMinutes: z.number().optional().describe("Meeting duration in minutes"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createMeetingNote", options, async (input) => {
        const { projectId, title, date, summary, actionItems, participants, durationMinutes, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the meeting note I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "document_metadata",
              fields: { project_id: projectId, title, date, summary, action_items: actionItems ?? null },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createMeetingNote", input);
        const replay = await getReplayResponse("createMeetingNote", idempotencyKey);
        if (replay) return replay;

        const { data, error } = await supabase
          .from("document_metadata")
          .insert({
            id: crypto.randomUUID(),
            project_id: projectId,
            title,
            date,
            summary,
            action_items: actionItems ?? null,
            participants: participants ?? null,
            duration_minutes: durationMinutes ?? null,
            type: "meeting",
            category: "meeting",
            source: "manual",
          })
          .select("id, title, date")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createMeetingNote",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const responseOut = {
          success: true,
          message: `Meeting notes for **"${title}"** saved.`,
          record: data,
          tip: "These notes are now searchable via the AI and will appear in project meeting history.",
        };
        await recordWriteAudit({
          toolName: "createMeetingNote",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),

    createSubmittal: tool({
      description:
        "Create a new submittal. Use when the user says 'create a submittal for [spec section]', " +
        "'log a submittal', or 'we need to submit [material/equipment]'. " +
        "Always preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        title: z.string().describe("Submittal title, e.g. 'Structural Steel Shop Drawings'"),
        specSection: z.string().optional().describe("Spec section number, e.g. '05 12 00'"),
        dueDate: z.string().optional().describe("ISO due date"),
        submittedBy: z.string().default("TBD").describe("Subcontractor or party submitting"),
        // Must match the submittals_status_check DB constraint. The old enum
        // used "pending"/"revise_resubmit" (neither allowed), so every insert
        // failed the check constraint. Default "Draft" mirrors the real
        // submittals create API.
        status: z
          .enum([
            "Draft",
            "Open",
            "Distributed",
            "Closed",
            "submitted",
            "under_review",
            "requires_revision",
            "approved",
            "rejected",
            "superseded",
          ])
          .default("Draft"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createSubmittal", options, async (input) => {
        const { projectId, title, specSection, dueDate, submittedBy, status, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the submittal I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "submittals",
              fields: { project_id: projectId, title, specification_section: specSection ?? null, final_due_date: dueDate ?? null, submitter_company: submittedBy, status },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createSubmittal", input);
        const replay = await getReplayResponse("createSubmittal", idempotencyKey);
        if (replay) return replay;

        // Get next submittal number for this project
        const { data: existing } = await supabase
          .from("submittals")
          .select("submittal_number")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastNum = existing?.[0]?.submittal_number ?? "000";
        const nextNumber = String(parseInt(String(lastNum).replace(/\D/g, "") || "0") + 1).padStart(3, "0");

        const { data, error } = await supabase
          .from("submittals")
          .insert({
            project_id: projectId,
            title,
            specification_section: specSection ?? null,
            final_due_date: dueDate ?? null,
            // submitted_by is a NOT NULL uuid FK to the authenticated user.
            // The free-text "submittedBy" (subcontractor / party submitting)
            // belongs in submitter_company, not this column.
            submitted_by: userId,
            submitter_company:
              submittedBy && submittedBy.trim() && submittedBy.trim().toUpperCase() !== "TBD"
                ? submittedBy.trim()
                : null,
            created_by: userId,
            status,
            submittal_number: nextNumber,
            revision: 0,
            is_private: false,
            updated_at: new Date().toISOString(),
          })
          .select("id, title, submittal_number, status")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createSubmittal",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const responseOut = {
          success: true,
          message: `Submittal #${data.submittal_number} — **"${title}"** created.`,
          record: data,
        };
        await recordWriteAudit({
          toolName: "createSubmittal",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),

    logDailyReport: tool({
      description:
        "Create a daily log entry for a project. Use when the user says " +
        "'log today's daily report', 'record site activity for [date]', or " +
        "'add a daily log entry'. Weather conditions and notes are stored as JSON. " +
        "Always preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID"),
        logDate: z.string().describe("ISO date, e.g. '2026-03-23'").default(new Date().toISOString().split("T")[0]),
        weather: z.string().optional().describe("Weather description, e.g. 'Clear, 72°F'"),
        crewCount: z.number().optional().describe("Total workers on site"),
        workPerformed: z.string().optional().describe("Summary of work performed"),
        notes: z.string().optional().describe("Additional notes or observations"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("logDailyReport", options, async (input) => {
        const { projectId, logDate, weather, crewCount, workPerformed, notes, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the daily log I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "daily_logs",
              fields: { project_id: projectId, log_date: logDate, weather, crew_count: crewCount ?? null, work_performed: workPerformed ?? null },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("logDailyReport", input);
        const replay = await getReplayResponse("logDailyReport", idempotencyKey);
        if (replay) return replay;

        const weatherConditions = (weather || crewCount || workPerformed || notes)
          ? { weather, crew_count: crewCount ?? null, work_performed: workPerformed ?? null, notes: notes ?? null }
          : null;

        const { data, error } = await supabase
          .from("daily_logs")
          .insert({
            project_id: projectId,
            log_date: logDate,
            weather_conditions: weatherConditions,
            updated_at: new Date().toISOString(),
          })
          .select("id, log_date")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "logDailyReport",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const responseOut = {
          success: true,
          message: `Daily log for **${logDate}** created.`,
          record: data,
          note: "Crew counts and equipment can be added via the Daily Log page in Alleato.",
        };
        await recordWriteAudit({
          toolName: "logDailyReport",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 3 — Synthesis & intelligence
    // -------------------------------------------------------------------------

    generateProjectSummary: tool({
      description:
        "Generate a comprehensive project status summary by pulling budget, schedule, " +
        "RFI, change order, and meeting data — then synthesizing it into a stored document. " +
        "Use when the user says 'give me a status summary', 'project report', or " +
        "'what's the status of [project]'. This creates a reusable document, not just a chat response.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID (provide this OR projectName)"),
        projectName: z.string().optional().describe("Project name (fuzzy match)"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("generateProjectSummary", options, async (input) => {
        const { projectId, projectName, confirmed } = input;

        if (!confirmed) {
          return {
            action: "preview",
            message: "I'll generate and save this project summary. Reply **confirm** to proceed.",
            preview: {
              target: "document_metadata",
              fields: {
                project_id: projectId ?? null,
                project_name: projectName ?? null,
                type: "project_summary",
              },
            },
          };
        }

        // Resolve project
        let project: { id: number; name: string };
        if (projectId) {
          const { data, error } = await supabase
            .from("projects")
            .select("id, name, phase, health_status, health_score, completion_percentage")
            .eq("id", projectId)
            .single();
          if (error || !data) return { success: false, error: `Project ${projectId} not found` };
          project = { id: data.id, name: data.name ?? "" };
        } else if (projectName) {
          const { data, error } = await supabase
            .from("projects")
            .select("id, name, phase, health_status, health_score, completion_percentage")
            .ilike("name", `%${projectName}%`)
            .limit(1)
            .single();
          if (error || !data) return { success: false, error: `No project matching "${projectName}"` };
          project = { id: data.id, name: data.name ?? "" };
        } else {
          return { success: false, error: "Provide either projectId or projectName" };
        }

        const access = await enforceProjectWriteAccess(project.id);
        if (!access.ok) return { success: false, error: access.error };
        const idempotencyKey = resolveIdempotencyKey("generateProjectSummary", input);
        const replay = await getReplayResponse("generateProjectSummary", idempotencyKey);
        if (replay) return replay;

        // Pull data in separate awaits to avoid TS2589 (excessive type depth from large Promise.all)
        const now = new Date();

        const projectDetails = await supabase
          .from("projects")
          .select("id, name, phase, health_status, health_score, completion_percentage, budget, budget_used, summary")
          .eq("id", project.id)
          .single();

        const budgetData = await supabase
          .from("budget_lines")
          .select("id, description, original_amount, cost_code_id, cost_type_id")
          .eq("project_id", project.id)
          .limit(50);

        const financialData = await supabase
          .from("prime_contract_financial_summary")
          .select("original_contract_amount, revised_contract_amount, approved_change_orders, pending_change_orders, invoiced_amount, payments_received")
          .eq("project_id", project.id);

        const scheduleData = await supabase
          .from("schedule_tasks")
          .select("id, name, status, start_date, finish_date, percent_complete, is_milestone")
          .eq("project_id", project.id)
          .order("finish_date", { ascending: true, nullsFirst: false })
          .limit(100);

        const rfiData = await supabase
          .from("rfis")
          .select("id, number, subject, status, due_date, ball_in_court, cost_impact, schedule_impact")
          .eq("project_id", project.id)
          .order("number", { ascending: false })
          .limit(30);

        const changeOrderData = await supabase
          .from("prime_contract_change_orders")
          .select("id, title, status, total_amount, created_at")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
          .limit(20);

        const changeEventData = await supabase
          .from("change_events")
          .select("id, number, title, status, type, scope, created_at")
          .eq("project_id", project.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(20);

        const meetingData = await supabase
          .from("document_metadata")
          .select("id, title, date, summary, action_items, participants")
          .eq("project_id", project.id)
          .or("type.eq.meeting,category.eq.meeting")
          .order("date", { ascending: false })
          .limit(5);

        // Pipeline B: resolve project → target, then pull recent risk-bucket
        // insight cards for the LLM synthesis prompt.
        const summaryTargetMap = await resolveTargetIdsForProjects(supabase, [project.id]);
        const summaryTargetId = summaryTargetMap.get(project.id);
        const insightData = summaryTargetId
          ? await insightCardBaseQuery(supabase)
              .eq("primary_target_id", summaryTargetId)
              .in("card_type", [...RISK_CARD_TYPES, "change_management", "process_issue"])
              .order("created_at", { ascending: false })
              .limit(10)
          : { data: [], error: null };

        // Compute summary stats
        const tasks = scheduleData.data ?? [];
        const rfis = rfiData.data ?? [];
        const cos = changeOrderData.data ?? [];
        const ces = changeEventData.data ?? [];
        const meetings = meetingData.data ?? [];
        const insights = insightData.data ?? [];
        const budget = budgetData.data ?? [];
        const financial = financialData.data ?? [];
        const proj = projectDetails.data;

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.percent_complete === 100 || t.status === "Complete").length;
        const overdueTasks = tasks.filter(t => t.finish_date && new Date(t.finish_date) < now && (t.percent_complete ?? 0) < 100).length;
        const openRfis = rfis.filter(r => r.status !== "Closed" && r.status !== "Answered").length;
        const overdueRfis = rfis.filter(r => r.due_date && new Date(r.due_date) < now && r.status !== "Closed" && r.status !== "Answered").length;

        const totalOriginalBudget = budget.reduce((sum, b) => sum + (Number(b.original_amount) || 0), 0);
        const totalRevisedBudget = totalOriginalBudget; // revised = original + approved mods (simplified)

        const approvedCOs = cos.filter(c => c.status === "Approved" || c.status === "approved");
        const pendingCOs = cos.filter(c => c.status === "Draft" || c.status === "draft" || c.status === "Pending" || c.status === "pending");
        const totalApprovedCOAmount = approvedCOs.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);
        const totalPendingCOAmount = pendingCOs.reduce((sum, c) => sum + (Number(c.total_amount) || 0), 0);

        const openChangeEvents = ces.filter(c => c.status !== "Approved" && c.status !== "Rejected" && c.status !== "Void" && c.status !== "Closed").length;

        const contractValue = financial.length > 0 ? Number(financial[0].original_contract_amount) || 0 : 0;
        const revisedContractValue = financial.length > 0 ? Number(financial[0].revised_contract_amount) || 0 : 0;
        const invoicedAmount = financial.length > 0 ? Number(financial[0].invoiced_amount) || 0 : 0;

        // Build structured data for LLM synthesis
        const summaryData = {
          project: {
            name: proj?.name,
            phase: proj?.phase,
            healthStatus: proj?.health_status,
            healthScore: proj?.health_score,
            completionPct: proj?.completion_percentage,
          },
          financial: {
            originalBudget: totalOriginalBudget,
            revisedBudget: totalRevisedBudget,
            contractValue,
            revisedContractValue,
            invoicedAmount,
            approvedCOCount: approvedCOs.length,
            approvedCOAmount: totalApprovedCOAmount,
            pendingCOCount: pendingCOs.length,
            pendingCOAmount: totalPendingCOAmount,
            openChangeEvents,
          },
          schedule: {
            totalTasks,
            completedTasks,
            overdueTasks,
            completionPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            upcomingMilestones: tasks
              .filter(t => t.is_milestone && t.finish_date && new Date(t.finish_date) >= now && (t.percent_complete ?? 0) < 100)
              .slice(0, 5)
              .map(t => ({ name: t.name, date: t.finish_date, percentComplete: t.percent_complete })),
          },
          rfis: {
            total: rfis.length,
            open: openRfis,
            overdue: overdueRfis,
            recentOpen: rfis
              .filter(r => r.status !== "Closed" && r.status !== "Answered")
              .slice(0, 5)
              .map(r => ({ number: r.number, subject: r.subject, dueDate: r.due_date, ballInCourt: r.ball_in_court })),
          },
          recentMeetings: meetings.slice(0, 3).map(m => ({
            title: m.title,
            date: m.date,
            summary: m.summary?.substring(0, 200),
          })),
          activeRisks: insights.map((card) => ({
            title: card.title,
            severity: deriveSeverity({ card_type: card.card_type, confidence: card.confidence }),
            type: card.card_type,
          })),
        };

        // Synthesize with LLM
        const openai = getOpenAI();
        const completion = await openai.chat.completions.create({
          model: "gpt-5.4-mini",
          temperature: 0.3,
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: `You are a construction project manager writing a concise executive status summary.
Write in professional, direct language. Use bullet points for lists. Include specific numbers.
Structure: Executive Summary (2-3 sentences) → Financial Status → Schedule Status → Open Items → Risks → Recent Activity.
Keep the total under 800 words. Do not use markdown headers larger than ###.`,
            },
            {
              role: "user",
              content: `Generate a project status summary for "${project.name}" using this data:\n\n${JSON.stringify(summaryData, null, 2)}`,
            },
          ],
        });

        const synthesizedSummary = completion.choices[0]?.message?.content ?? "Summary generation failed.";

        // Store in document_metadata
        const summaryId = crypto.randomUUID();
        const { data: savedDoc, error: saveError } = await supabase
          .from("document_metadata")
          .insert({
            id: summaryId,
            project_id: project.id,
            title: `Project Status Summary — ${project.name} — ${now.toISOString().split("T")[0]}`,
            summary: synthesizedSummary,
            type: "project_summary",
            category: "ai_generated",
            source: "ai_strategist",
            date: now.toISOString().split("T")[0],
          })
          .select("id, title")
          .single();

        if (saveError) {
          const partial = {
            success: true,
            message: `Summary generated but could not be saved: ${saveError.message}`,
            summary: synthesizedSummary,
            data: summaryData,
          };
          await recordWriteAudit({
            toolName: "generateProjectSummary",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: partial,
          });
          return partial;
        }

        const responseOut = {
          success: true,
          message: `Project status summary for **${project.name}** generated and saved.`,
          summary: synthesizedSummary,
          documentId: savedDoc?.id,
          documentTitle: savedDoc?.title,
          data: summaryData,
          nextSteps: [
            "Share this summary with stakeholders",
            "Review flagged risks and assign owners",
            "Update any overdue items",
          ],
        };
        await recordWriteAudit({
          toolName: "generateProjectSummary",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Command Center integration
    // -------------------------------------------------------------------------

    createInitiativeCard: tool({
      description:
        "Create an initiative card on the Command Center board. Use when the user says " +
        "'add this to the board', 'create an initiative for [idea]', 'track this idea', " +
        "'remember this feature request', 'add a card for [thing]', or discusses any " +
        "idea, feature, bug, or task that should be tracked on the kanban board. " +
        "Does NOT require confirmation — cards are easy to edit/delete.",
      inputSchema: z.object({
        title: z.string().describe("Card title — concise, actionable"),
        description: z.string().optional().describe("Details, context, acceptance criteria"),
        status: z
          .enum(["idea", "planned", "in_progress", "done"])
          .default("idea")
          .describe("Board column — defaults to idea"),
        priority: z
          .enum(["urgent", "high", "medium", "low"])
          .default("medium")
          .describe("Priority level"),
        labels: z
          .array(z.string())
          .optional()
          .describe("Tags like AI, Frontend, Backend, Design, Bug Fix"),
        assignee: z.string().optional().describe("Person responsible"),
        dueDate: z.string().optional().describe("ISO due date"),
        githubIssueUrl: z.string().optional().describe("Link to GitHub issue if known"),
        linkedRecordType: z
          .string()
          .optional()
          .describe("Type of linked Alleato record: project, commitment, rfi, change_order, etc."),
        linkedRecordId: z
          .string()
          .optional()
          .describe("ID of the linked Alleato record"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createInitiativeCard", options, async (input) => {
        const {
          title,
          description,
          status,
          priority,
          labels,
          assignee,
          dueDate,
          githubIssueUrl,
          linkedRecordType,
          linkedRecordId,
          confirmed,
        } = input;

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the initiative card I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "initiative_cards",
              fields: {
                title,
                status,
                priority,
                labels: labels ?? [],
                assignee: assignee ?? null,
                due_date: dueDate ?? null,
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createInitiativeCard", input);
        const replay = await getReplayResponse("createInitiativeCard", idempotencyKey);
        if (replay) return replay;

        // Get max sort_order for target column
        const { data: maxRow } = await supabase
          .from("initiative_cards")
          .select("sort_order")
          .eq("status", status)
          .order("sort_order", { ascending: false })
          .limit(1)
          .single();

        const nextOrder = (maxRow?.sort_order ?? -1) + 1;

        const { data, error } = await supabase
          .from("initiative_cards")
          .insert({
            title,
            description: description ?? null,
            status,
            priority,
            labels: labels ?? [],
            sort_order: nextOrder,
            source: "ai_chat",
            assignee: assignee ?? null,
            due_date: dueDate ?? null,
            github_issue_url: githubIssueUrl ?? null,
            linked_record_type: linkedRecordType ?? null,
            linked_record_id: linkedRecordId ?? null,
          })
          .select("id, title, status, priority")
          .single();

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "createInitiativeCard",
            idempotencyKey,
            projectId: null,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const responseOut = {
          success: true,
          message: `Initiative **"${title}"** added to the ${status.replace("_", " ")} column.`,
          record: data,
          boardUrl: "/command-center",
          tip: "View and drag cards on the Command Center board.",
        };
        await recordWriteAudit({
          toolName: "createInitiativeCard",
          idempotencyKey,
          projectId: null,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),


    // -------------------------------------------------------------------------
    // TIER 1 — Commitment creation (subcontracts & purchase orders)
    // -------------------------------------------------------------------------

    createCommitment: tool({
      description:
        "Create a new commitment — either a subcontract (for labor/trade work) or a " +
        "purchase order (for materials or equipment). Use when the user says " +
        "'create a subcontract', 'add a PO', 'set up a commitment with [vendor]', " +
        "or describes awarding work to a subcontractor or supplier. " +
        "Always show a preview and ask for confirmation before writing. " +
        "If projectId is unknown, call getPortfolioOverview first.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID — required"),
        type: z
          .enum(["subcontract", "purchase_order"])
          .describe(
            "Type of commitment: 'subcontract' for labor/trade work, 'purchase_order' for materials/equipment",
          ),
        title: z.string().describe("Commitment title, e.g. 'Electrical Work' or 'Structural Steel Supply'"),
        vendorName: z
          .string()
          .optional()
          .describe("Vendor or subcontractor company name — used to look up contract_company_id"),
        contractNumber: z
          .string()
          .optional()
          .describe("Contract number — auto-generated (SC-001 or PO-001) if not provided"),
        status: z
          .enum(["Draft", "Out for Bid", "Out for Signature", "Approved", "Complete", "Terminated", "Void"])
          .default("Draft")
          .describe("Initial status — defaults to Draft"),
        description: z.string().optional().describe("Scope description"),
        startDate: z.string().optional().describe("ISO start date, e.g. '2026-04-01'"),
        estimatedCompletionDate: z.string().optional().describe("ISO estimated completion date"),
        defaultRetainagePercent: z
          .number()
          .optional()
          .describe("Default retainage percentage, e.g. 10 for 10%"),
        lineItems: z
          .array(commitmentLineItemSchema)
          .optional()
          .describe(
            "Optional SOV line items to create with the commitment after confirmation",
          ),
        confirmed: z
          .boolean()
          .default(false)
          .describe("Set to true only after user confirms the preview"),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createCommitment", options, async (input) => {
        const {
          projectId,
          type,
          title,
          vendorName,
          contractNumber,
          status,
          description,
          startDate,
          estimatedCompletionDate,
          defaultRetainagePercent,
          lineItems,
          confirmed,
        } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        const table = type === "subcontract" ? "subcontracts" : "purchase_orders";
        const prefix = type === "subcontract" ? "SC" : "PO";

        // Auto-generate contract number if not provided
        let finalContractNumber = contractNumber;
        if (!finalContractNumber) {
          const { data: existing } = await runtimeCommitmentReadClient
            .from(table)
            .select("contract_number")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(100);

          // Find highest numeric suffix among existing contract numbers for this prefix
          let maxNum = 0;
          for (const row of existing ?? []) {
            const match = row.contract_number?.match(new RegExp(`^${prefix}-(\\d+)$`));
            if (match) {
              const n = parseInt(match[1], 10);
              if (n > maxNum) maxNum = n;
            }
          }
          finalContractNumber = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
        }

        // Look up vendor ID by name if provided
        let contractCompanyId: string | null = null;
        if (vendorName) {
          const { data: vendorRows } = await supabase
            .from("companies")
            .select("id, name")
            .eq("is_vendor", true)
            .ilike("name", `%${vendorName}%`)
            .limit(1);

          if (vendorRows && vendorRows.length > 0) {
            contractCompanyId = vendorRows[0].id;
          }
        }

        if (!confirmed) {
          const previewFields = {
            project_id: projectId,
            contract_number: finalContractNumber,
            title,
            status,
            contract_company_id: contractCompanyId,
            vendor_name_resolved: contractCompanyId ? vendorName : vendorName ? `${vendorName} (not found in project directory — will need to be linked manually)` : null,
            description: description ?? null,
            start_date: startDate ?? null,
            estimated_completion_date: estimatedCompletionDate ?? null,
            default_retainage_percent: defaultRetainagePercent ?? null,
            line_items: lineItems ?? [],
          };
          const widget = buildCommitmentDraftWidget({
            projectId,
            type,
            title,
            contractNumber: finalContractNumber,
            status,
            vendorName: vendorName ?? null,
            contractCompanyId,
            description: description ?? null,
            startDate: startDate ?? null,
            estimatedCompletionDate: estimatedCompletionDate ?? null,
            defaultRetainagePercent: defaultRetainagePercent ?? null,
            lineItems,
          });
          const notificationDecision =
            await recordCommitmentPreviewNotificationDecision({
              userId,
              projectId,
              title,
              type,
              eventKey: resolvePreviewEventKey("createCommitment", previewFields),
            });

          return {
            action: "preview",
            message:
              `Here's the ${type === "subcontract" ? "subcontract" : "purchase order"} I'll create. ` +
              "Reply **confirm** to proceed or tell me what to change.",
            notificationDecision,
            widget,
            preview: {
              table,
              fields: previewFields,
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createCommitment", input);
        const replay = await getReplayResponse("createCommitment", idempotencyKey);
        if (replay) return replay;

        if (!contractCompanyId) {
          const failure = {
            success: false,
            error:
              vendorName
                ? `Cannot create the commitment because "${vendorName}" was not found in the vendor directory.`
                : "Cannot create the commitment without a vendor company.",
          };
          await recordWriteAudit({
            toolName: "createCommitment",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const lineItemErrors = validateCommitmentLineItems(lineItems);
        if (lineItemErrors.length > 0) {
          const failure = {
            success: false,
            error: "Cannot create the commitment because one or more SOV lines are invalid.",
            details: lineItemErrors,
          };
          await recordWriteAudit({
            toolName: "createCommitment",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        // Build the insert payload
        const insertPayload: Record<string, unknown> = {
          project_id: projectId,
          contract_number: finalContractNumber,
          title,
          status,
          executed: false,
          contract_company_id: contractCompanyId,
          description: description ?? null,
          default_retainage_percent: defaultRetainagePercent ?? null,
          updated_at: new Date().toISOString(),
        };

        if (type === "subcontract") {
          insertPayload.start_date = startDate ?? null;
          insertPayload.estimated_completion_date = estimatedCompletionDate ?? null;
          insertPayload.is_private = true;
          insertPayload.allow_non_admin_view_sov_items = false;
          insertPayload.non_admin_user_ids = [];
          insertPayload.invoice_contact_ids = [];
        } else {
          // purchase_order uses delivery_date instead of estimated_completion_date
          insertPayload.delivery_date = estimatedCompletionDate ?? null;
          insertPayload.is_private = true;
          insertPayload.allow_non_admin_view_sov_items = false;
          insertPayload.non_admin_user_ids = [];
          insertPayload.invoice_contact_ids = [];
        }

        const { data, error } = await runtimeCommitmentWriteClient
          .from(table)
          .insert(insertPayload)
          .select("id, contract_number, title, status")
          .single();

        if (error) {
          const failure = { success: false, error: (error as { message: string }).message };
          await recordWriteAudit({
            toolName: "createCommitment",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const label = type === "subcontract" ? "Subcontract" : "Purchase Order";
        const record = data as { id: string; contract_number: string; title: string; status: string };
        const sovInserts = buildCommitmentSovInserts({
          commitmentId: record.id,
          type,
          lineItems,
        });

        if (sovInserts.length > 0) {
          const sovResult =
            type === "subcontract"
              ? await supabase.from("subcontract_sov_items").insert(
                  sovInserts as SubcontractSovInsert[],
                )
              : await supabase.from("purchase_order_sov_items").insert(
                  sovInserts as PurchaseOrderSovInsert[],
                );

          if (sovResult.error) {
            const rollback =
              type === "subcontract"
                ? await supabase.from("subcontracts").delete().eq("id", record.id)
                : await supabase.from("purchase_orders").delete().eq("id", record.id);
            const failure = {
              success: false,
              error: `Commitment line items failed to save: ${sovResult.error.message}`,
              rollback: rollback.error
                ? `Base commitment rollback failed: ${rollback.error.message}`
                : "Base commitment rollback succeeded.",
            };
            await recordWriteAudit({
              toolName: "createCommitment",
              idempotencyKey,
              projectId: access.projectId,
              input,
              status: "error",
              response: failure,
            });
            return failure;
          }
        }

        const responseOut = {
          success: true,
          message:
            `${label} **${record.contract_number} — "${title}"** created successfully` +
            (sovInserts.length > 0
              ? ` with ${sovInserts.length} SOV line item${sovInserts.length === 1 ? "" : "s"}.`
              : "."),
          record: data,
          lineItemsCreated: sovInserts.length,
          nextSteps: [
            sovInserts.length > 0
              ? "Open the commitment detail page to review SOV line items"
              : "Open the Commitments page to add SOV line items and set the contract value",
            vendorName && !contractCompanyId
              ? `Link the vendor "${vendorName}" in the commitment detail page — they weren't found in the project directory`
              : null,
            "Upload the signed contract document when available",
            "Submit for approval when ready",
          ].filter(Boolean),
        };
        await recordWriteAudit({
          toolName: "createCommitment",
          idempotencyKey,
          projectId: access.projectId,
          input,
          status: "success",
          response: responseOut,
        });
        return responseOut;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Feedback / bug / feature request submission
    // -------------------------------------------------------------------------

    submitFeedback: tool({
      description:
        "Submit a bug report or feature request on behalf of the user — identical to " +
        "submitting the feedback form in the app. Use when the user says 'report a bug', " +
        "'something is broken', 'submit a feature request', 'I have a suggestion', " +
        "'can you log this issue', or describes a problem or improvement idea they want tracked. " +
        "Always show a preview and ask for confirmation before submitting.",
      inputSchema: z.object({
        type: z
          .enum(["bug", "feature_request"])
          .describe("'bug' for broken behaviour, 'feature_request' for new functionality or improvements"),
        title: z
          .string()
          .optional()
          .describe("Short title — auto-generated from description if omitted"),
        description: z
          .string()
          .describe("Full description of the bug or feature request — be as specific as possible"),
        severity: z
          .enum(["low", "medium", "high"])
          .default("medium")
          .describe("Impact level: 'low' = minor inconvenience, 'medium' = workflow blocked, 'high' = data loss or major blocker"),
        projectId: z
          .number()
          .optional()
          .describe("Project ID if the issue is specific to one project"),
        pagePath: z
          .string()
          .optional()
          .describe("The page or section where the issue occurs, e.g. '/budget' or 'Commitments'"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("submitFeedback", options, async (input) => {
        const { type, title, description, severity, projectId, pagePath, confirmed } = input;

        const requestType = type === "feature_request" ? "feature_request" : "bug";
        const resolvedPath = pagePath ?? "/ai-assistant";
        const resolvedTitle = buildAdminFeedbackTitle({
          providedTitle: title,
          requestType,
          comment: description,
        });

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the feedback I'll submit on your behalf. Reply **confirm** to proceed.",
            preview: {
              type: type === "feature_request" ? "Feature Request" : "Bug Report",
              title: resolvedTitle,
              description,
              severity,
              pagePath: resolvedPath,
              projectId: projectId ?? null,
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("submitFeedback", input);
        const replay = await getReplayResponse("submitFeedback", idempotencyKey);
        if (replay) return replay;

        const supabaseLocal = createServiceClient();
        const feedbackId = crypto.randomUUID();

        const { error: insertError } = await supabaseLocal
          .from("admin_feedback_items")
          .insert({
            id: feedbackId,
            created_by: userId,
            title: resolvedTitle,
            comment: description,
            page_url: resolvedPath,
            page_path: resolvedPath,
            page_title: null,
            request_type: requestType,
            board_status: type === "feature_request" ? "submitted" : "submitted",
            severity,
            status: "open",
            target_selector: "ai-assistant-chat",
            target_id: null,
            target_tag: null,
            target_text: null,
            dom_path: null,
            target_rect: null,
            screenshot_path: null,
            screenshot_url: null,
            project_id: projectId ?? null,
            metadata: { source: "ai_assistant", submitted_by_ai: true },
          });

        if (insertError) {
          const failure = { success: false, error: insertError.message };
          await recordWriteAudit({
            toolName: "submitFeedback",
            idempotencyKey,
            projectId: projectId ?? null,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        // Run side effects: tool matching, GitHub issue, learning ingestion
        let githubIssueNumber: number | null = null;
        let githubIssueUrl: string | null = null;

        let feedbackSideEffectError: string | null = null;
        try {
          const matchedTool = await matchFeedbackToTool(
            resolvedTitle,
            description,
            resolvedPath,
            resolvedPath,
          );

          let toolContext = null;
          if (matchedTool) {
            const resolved = await resolveToolContext(matchedTool);
            toolContext = resolved;
            const agentPayload = resolved ? contextToAgentPayload(resolved) : null;
            await supabaseLocal
              .from("admin_feedback_items")
              .update({
                tool_id: matchedTool.id,
                agent_context: agentPayload as Json,
              })
              .eq("id", feedbackId);
          }

          const githubIssue = await createGitHubIssue({
            title: resolvedTitle,
            comment: description,
            pageUrl: resolvedPath,
            pagePath: resolvedPath,
            pageTitle: null,
            requestType,
            severity,
            targetId: null,
            targetSelector: "ai-assistant-chat",
            targetTag: null,
            targetText: null,
            domPath: null,
            screenshotUrl: null,
            projectId: projectId ?? null,
            metadata: { source: "ai_assistant", submitted_by_ai: true },
            toolContext,
          });

          if (githubIssue) {
            githubIssueNumber = githubIssue.number;
            githubIssueUrl = githubIssue.url;
            await supabaseLocal
              .from("admin_feedback_items")
              .update({
                github_issue_number: githubIssue.number,
                github_issue_url: githubIssue.url,
                github_issue_state: githubIssue.state,
                status: "submitted",
              })
              .eq("id", feedbackId);
          }

          await ingestAdminFeedbackLearning({
            feedbackItemId: feedbackId,
            title: resolvedTitle,
            comment: description,
            pagePath: resolvedPath,
            projectId: projectId ?? null,
            status: "candidate",
          });
        } catch (error) {
          feedbackSideEffectError = error instanceof Error ? error.message : String(error);
        }

        const response = {
          success: true,
          message: githubIssueUrl
            ? `${type === "feature_request" ? "Feature request" : "Bug report"} **"${resolvedTitle}"** submitted and GitHub issue [#${githubIssueNumber}](${githubIssueUrl}) created.`
            : `${type === "feature_request" ? "Feature request" : "Bug report"} **"${resolvedTitle}"** submitted successfully.`,
          feedbackId,
          githubIssueNumber,
          githubIssueUrl,
          sideEffectWarning: feedbackSideEffectError
            ? `Feedback was saved, but follow-up processing failed: ${feedbackSideEffectError}`
            : null,
          tip: type === "feature_request"
            ? "You can track this on the Product Board at /product-board."
            : "You can track this in the Admin Feedback inbox.",
        };
        await recordWriteAudit({
          toolName: "submitFeedback",
          idempotencyKey,
          projectId: projectId ?? null,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Add item to Product Board
    // -------------------------------------------------------------------------

    addBoardItem: tool({
      description:
        "Add a feature idea, initiative, or product improvement directly to the Product Board " +
        "kanban. Use when the user says 'add this to the board', 'put this on the product board', " +
        "'log this as a feature idea', 'add to planned', 'add to in progress', or wants to track " +
        "a product idea with a specific status column. " +
        "Always show a preview and ask for confirmation before writing.",
      inputSchema: z.object({
        title: z.string().describe("Short, clear title for the board card"),
        description: z.string().describe("Full description — context, goals, acceptance criteria"),
        board_status: z
          .enum(["submitted", "in_review", "planned", "in_progress", "shipped"])
          .default("submitted")
          .describe(
            "Which column to place the card in: " +
            "'submitted' = new idea, 'in_review' = being evaluated, " +
            "'planned' = confirmed for roadmap, 'in_progress' = actively being built, " +
            "'shipped' = done"
          ),
        severity: z
          .enum(["low", "medium", "high"])
          .default("medium")
          .describe("Priority: low / medium / high"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("addBoardItem", options, async (input) => {
        const { title, description, board_status, severity, confirmed } = input;

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the board card I'll create. Reply **confirm** to add it.",
            preview: {
              title,
              description,
              column: board_status,
              priority: severity,
              board: "/product-board",
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("addBoardItem", input);
        const replay = await getReplayResponse("addBoardItem", idempotencyKey);
        if (replay) return replay;

        const supabaseLocal = createServiceClient();
        const itemId = crypto.randomUUID();

        const { error } = await supabaseLocal.from("admin_feedback_items").insert({
          id: itemId,
          created_by: userId,
          title,
          comment: description,
          page_url: "/ai-assistant",
          page_path: "/ai-assistant",
          page_title: "AI Assistant",
          request_type: "feature_request",
          board_status,
          severity,
          status: "open",
          target_selector: "ai-assistant-chat",
          target_id: null,
          target_tag: null,
          target_text: null,
          dom_path: null,
          target_rect: null,
          screenshot_path: null,
          screenshot_url: null,
          project_id: null,
          metadata: { source: "ai_assistant", submitted_by_ai: true },
        });

        if (error) {
          const failure = { success: false, error: error.message };
          await recordWriteAudit({
            toolName: "addBoardItem",
            idempotencyKey,
            projectId: null,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }

        const response = {
          success: true,
          message: `**"${title}"** added to the **${board_status.replace(/_/g, " ")}** column on the [Product Board](/product-board).`,
          itemId,
          board_status,
        };
        await recordWriteAudit({
          toolName: "addBoardItem",
          idempotencyKey,
          projectId: null,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Create Outlook calendar invite
    // -------------------------------------------------------------------------

    createOutlookCalendarInvite: tool({
      description:
        "Create an Outlook calendar invite through Microsoft Graph. Use when the user asks to schedule a meeting, " +
        "send a calendar invite, add something to Outlook, or create a Teams meeting invite. Always return a preview " +
        "first with the adaptive-card calendar widget, then write only after confirmation.",
      inputSchema: z.object({
        organizerEmail: z
          .string()
          .email()
          .optional()
          .describe("Organizer mailbox. If omitted, the configured Outlook calendar user is used."),
        subject: z.string().describe("Invite subject"),
        body: z.string().describe("Invite body or agenda"),
        startDateTime: z.string().describe("ISO-compatible local start date/time, e.g. 2026-05-13T14:00:00"),
        endDateTime: z.string().describe("ISO-compatible local end date/time"),
        timeZone: z.string().default("Eastern Standard Time"),
        location: z.string().default("Microsoft Teams"),
        attendees: z.array(outlookInviteAttendeeSchema).min(1),
        isOnlineMeeting: z.boolean().default(true),
        projectId: z.number().optional().describe("Project ID if this invite is tied to a project"),
        confirmed: z.boolean().default(false).describe("Set to true only after the user confirms the preview"),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createOutlookCalendarInvite", options, async (input) => {
        if (typeof input.projectId === "number") {
          const access = await enforceProjectWriteAccess(input.projectId);
          if (!access.ok) return { success: false, error: access.error };
        }

        let organizerEmail: string;
        try {
          organizerEmail = resolveOutlookOrganizerEmail(input.organizerEmail);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            widget: {
              type: "calendar_invite",
              id: "outlook-calendar-invite-blocked",
              title: "Calendar invite blocked",
              status: "blocked",
              organizerEmail: input.organizerEmail ?? null,
              subject: input.subject,
              body: input.body,
              startDateTime: input.startDateTime,
              endDateTime: input.endDateTime,
              timeZone: input.timeZone,
              location: input.location,
              attendees: input.attendees,
              adaptiveCard: buildCalendarInviteAdaptiveCard({
                title: input.subject,
                startLabel: input.startDateTime,
                endLabel: input.endDateTime,
                location: input.location,
                attendeeLabel: `${input.attendees.length} attendee${input.attendees.length === 1 ? "" : "s"}`,
                status: "blocked",
              }),
              confirmPrompt: "Fix the Outlook calendar configuration before creating this invite.",
            },
          };
        }

        const attendeeLabel = `${input.attendees.length} attendee${input.attendees.length === 1 ? "" : "s"}`;
        const adaptiveCard = buildCalendarInviteAdaptiveCard({
          title: input.subject,
          startLabel: input.startDateTime,
          endLabel: input.endDateTime,
          location: input.location,
          attendeeLabel,
          status: input.confirmed ? "created" : "draft",
        });

        if (!input.confirmed) {
          return {
            action: "preview",
            message: "Here's the Outlook calendar invite I'll create. Reply **confirm** to send it.",
            subject: input.subject,
            body: input.body,
            organizerEmail,
            startDateTime: input.startDateTime,
            endDateTime: input.endDateTime,
            timeZone: input.timeZone,
            location: input.location,
            attendees: input.attendees,
            adaptiveCard,
            widget: {
              type: "calendar_invite",
              id: "outlook-calendar-invite-preview",
              title: "Outlook calendar invite",
              status: "draft",
              organizerEmail,
              subject: input.subject,
              body: input.body,
              startDateTime: input.startDateTime,
              endDateTime: input.endDateTime,
              timeZone: input.timeZone,
              location: input.location,
              attendees: input.attendees,
              adaptiveCard,
              confirmPrompt: "Confirm this Outlook calendar invite and create it with createOutlookCalendarInvite.",
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createOutlookCalendarInvite", input);
        const replay = await getReplayResponse("createOutlookCalendarInvite", idempotencyKey);
        if (replay) return replay;

        try {
          const event = await createOutlookCalendarInvite({
            organizerEmail,
            subject: input.subject,
            body: input.body,
            startDateTime: input.startDateTime,
            endDateTime: input.endDateTime,
            timeZone: input.timeZone,
            location: input.location,
            attendees: input.attendees,
            isOnlineMeeting: input.isOnlineMeeting,
            transactionId: idempotencyKey,
          });
          const createdAdaptiveCard = buildCalendarInviteAdaptiveCard({
            title: event.subject,
            startLabel: event.startDateTime,
            endLabel: event.endDateTime,
            location: input.location,
            attendeeLabel,
            status: "created",
            openUrl: event.webLink,
          });
          const response = {
            success: true,
            message: `Outlook invite **${event.subject}** created for ${attendeeLabel}.`,
            outlookEventId: event.id,
            outlookWebLink: event.webLink,
            teamsJoinUrl: event.joinUrl,
            organizerEmail: event.organizerEmail,
            subject: event.subject,
            body: input.body,
            startDateTime: event.startDateTime,
            endDateTime: event.endDateTime,
            timeZone: event.timeZone,
            location: input.location,
            attendees: input.attendees,
            adaptiveCard: createdAdaptiveCard,
            widget: {
              type: "calendar_invite",
              id: event.id,
              title: "Outlook calendar invite",
              status: "created",
              organizerEmail: event.organizerEmail,
              subject: event.subject,
              body: input.body,
              startDateTime: event.startDateTime,
              endDateTime: event.endDateTime,
              timeZone: event.timeZone,
              location: input.location,
              attendees: input.attendees,
              outlookEventId: event.id,
              outlookWebLink: event.webLink,
              teamsJoinUrl: event.joinUrl,
              adaptiveCard: createdAdaptiveCard,
              confirmPrompt: "Outlook calendar invite created.",
            },
          };
          await recordWriteAudit({
            toolName: "createOutlookCalendarInvite",
            idempotencyKey,
            projectId: input.projectId ?? null,
            input,
            status: "success",
            response,
          });
          return response;
        } catch (error) {
          const failure = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            subject: input.subject,
            organizerEmail,
          };
          await recordWriteAudit({
            toolName: "createOutlookCalendarInvite",
            idempotencyKey,
            projectId: input.projectId ?? null,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Create Outlook email draft
    // -------------------------------------------------------------------------

    draftOutlookEmail: tool({
      description:
        "Create a draft email in Outlook through Microsoft Graph. Use when the user asks to draft an email, draft a reply, prepare an Outlook response, or write a message for later review. Always preview first and never send. For reply drafts, ground the response through the Microsoft Executive Assistant specialist or a live Graph message/thread lookup before calling this tool. When drafting from Brandon's mailbox, apply the Brandon communication resources: docs/archive/2026-06-22-docs-migration/ai-plan/brandon-email-voice-profile.md for voice, docs/archive/2026-06-22-docs-migration/ai-plan/brandon-operating-profile.md for owner/operator judgment, and docs/archive/2026-06-22-docs-migration/ai-plan/brandon-email-drafting-playbook.md for reply patterns. Drafts must be short, direct, action-oriented, grounded in the current thread, and must ask for confirmation when cost, scope, schedule, owner, or attachment evidence is missing.",
      inputSchema: z.object({
        mailboxUserId: z
          .string()
          .optional()
          .describe("Mailbox user ID/email to create the draft in. If omitted, the configured Outlook mail user is used."),
        replyToGraphMessageId: z
          .string()
          .optional()
          .describe("Graph message ID when this should be a reply draft instead of a new message draft."),
        subject: z.string().describe("Draft subject. For replies, use the source email subject or RE: subject."),
        body: z.string().describe("Draft body written as the email content Brandon should review."),
        toRecipients: z
          .array(outlookMailRecipientSchema)
          .default([])
          .describe("Primary recipients for a new draft. Reply drafts may infer recipients from the original Graph message."),
        ccRecipients: z.array(outlookMailRecipientSchema).optional().default([]),
        bccRecipients: z.array(outlookMailRecipientSchema).optional().default([]),
        importance: z.enum(["low", "normal", "high"]).optional().default("normal"),
        projectId: z.number().optional().describe("Project ID if the draft is tied to a project"),
        confirmed: z.boolean().default(false).describe("Set to true only after the user confirms the preview"),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("draftOutlookEmail", options, async (input) => {
        const access = await enforceProjectWriteAccess(input.projectId);
        if (!access.ok) return { success: false, error: access.error };

        let mailboxUserId: string;
        try {
          mailboxUserId = resolveOutlookMailboxUserId(input.mailboxUserId);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            widget: {
              type: "outlook_email_draft",
              id: "outlook-email-draft-blocked",
              title: "Outlook email draft blocked",
              status: "blocked",
              mailboxUserId: input.mailboxUserId ?? null,
              mode: input.replyToGraphMessageId ? "reply" : "new_message",
              subject: input.subject,
              body: input.body,
              toRecipients: input.toRecipients,
              ccRecipients: input.ccRecipients,
              bccRecipients: input.bccRecipients,
              adaptiveCard: buildOutlookMailDraftAdaptiveCard({
                title: input.subject,
                mailboxUserId: input.mailboxUserId ?? "not configured",
                recipientLabel: `${input.toRecipients.length} recipient${input.toRecipients.length === 1 ? "" : "s"}`,
                status: "blocked",
                mode: input.replyToGraphMessageId ? "reply" : "new_message",
              }),
              confirmPrompt: "Fix the Outlook mail configuration before creating this draft.",
            },
          };
        }

        const mode = input.replyToGraphMessageId ? "reply" : "new_message";
        const recipientCount =
          input.toRecipients.length +
          input.ccRecipients.length +
          input.bccRecipients.length;
        const recipientLabel = mode === "reply" && recipientCount === 0
          ? "inferred from original message"
          : `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}`;
        const adaptiveCard = buildOutlookMailDraftAdaptiveCard({
          title: input.subject,
          mailboxUserId,
          recipientLabel,
          status: input.confirmed ? "created" : "draft",
          mode,
        });

        if (!input.confirmed) {
          return {
            action: "preview",
            message: "Here's the Outlook email draft I'll create. Reply **confirm** to save it to Outlook drafts.",
            mailboxUserId,
            mode,
            subject: input.subject,
            body: input.body,
            toRecipients: input.toRecipients,
            ccRecipients: input.ccRecipients,
            bccRecipients: input.bccRecipients,
            replyToGraphMessageId: input.replyToGraphMessageId ?? null,
            voiceProfile: BRANDON_EMAIL_VOICE_PROFILE,
            adaptiveCard,
            widget: {
              type: "outlook_email_draft",
              id: "outlook-email-draft-preview",
              title: "Outlook email draft",
              status: "draft",
              mailboxUserId,
              mode,
              subject: input.subject,
              body: input.body,
              toRecipients: input.toRecipients,
              ccRecipients: input.ccRecipients,
              bccRecipients: input.bccRecipients,
              replyToGraphMessageId: input.replyToGraphMessageId ?? null,
              voiceProfile: BRANDON_EMAIL_VOICE_PROFILE,
              adaptiveCard,
              confirmPrompt: "Confirm this Outlook email draft and create it with draftOutlookEmail.",
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("draftOutlookEmail", input);
        const replay = await getReplayResponse("draftOutlookEmail", idempotencyKey);
        if (replay) return replay;

        try {
          const draft = await createOutlookMailDraft({
            mailboxUserId,
            replyToGraphMessageId: input.replyToGraphMessageId,
            subject: input.subject,
            body: input.body,
            toRecipients: input.toRecipients,
            ccRecipients: input.ccRecipients,
            bccRecipients: input.bccRecipients,
            importance: input.importance,
          });
          const createdAdaptiveCard = buildOutlookMailDraftAdaptiveCard({
            title: draft.subject,
            mailboxUserId: draft.mailboxUserId,
            recipientLabel,
            status: "created",
            mode: draft.mode,
            openUrl: draft.webLink,
          });
          const response = {
            success: true,
            message: `Outlook draft **${draft.subject}** created in ${draft.mailboxUserId}.`,
            outlookDraftId: draft.id,
            outlookWebLink: draft.webLink,
            mailboxUserId: draft.mailboxUserId,
            mode: draft.mode,
            subject: draft.subject,
            body: input.body,
            toRecipients: input.toRecipients,
            ccRecipients: input.ccRecipients,
            bccRecipients: input.bccRecipients,
            replyToGraphMessageId: input.replyToGraphMessageId ?? null,
            voiceProfile: BRANDON_EMAIL_VOICE_PROFILE,
            adaptiveCard: createdAdaptiveCard,
            widget: {
              type: "outlook_email_draft",
              id: draft.id,
              title: "Outlook email draft",
              status: "created",
              mailboxUserId: draft.mailboxUserId,
              mode: draft.mode,
              subject: draft.subject,
              body: input.body,
              toRecipients: input.toRecipients,
              ccRecipients: input.ccRecipients,
              bccRecipients: input.bccRecipients,
              replyToGraphMessageId: input.replyToGraphMessageId ?? null,
              voiceProfile: BRANDON_EMAIL_VOICE_PROFILE,
              outlookDraftId: draft.id,
              outlookWebLink: draft.webLink,
              adaptiveCard: createdAdaptiveCard,
              confirmPrompt: "Outlook email draft created. Open it in Outlook to review and send.",
            },
          };
          await recordWriteAudit({
            toolName: "draftOutlookEmail",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "success",
            response,
          });
          return response;
        } catch (error) {
          const failure = {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            subject: input.subject,
            mailboxUserId,
          };
          await recordWriteAudit({
            toolName: "draftOutlookEmail",
            idempotencyKey,
            projectId: access.projectId,
            input,
            status: "error",
            response: failure,
          });
          return failure;
        }
      }),
    }),

    // -------------------------------------------------------------------------
    // TIER 1 — Send Teams message
    // -------------------------------------------------------------------------

    sendTeamsMessage: tool({
      description:
        "Send a direct Teams message to a person via the Archon bot. Use when the user says " +
        "'send [person] a Teams message', 'message [person] on Teams', 'follow up with [person] about [topic]', " +
        "'ping [person]', or describes wanting to communicate with a team member via Teams. " +
        "Look up the person by name first, then preview the message before sending. " +
        "The recipient must have linked their Alleato account to Teams (messaged the Archon bot before).",
      inputSchema: z.object({
        recipientName: z.string().describe("Full name or first name of the person to message"),
        recipientEmail: z.string().optional().describe("Email address if known — helps with exact lookup"),
        message: z.string().describe("The message text to send — write it as if you are sending it directly"),
        confirmed: z.boolean().default(false).describe("Set to true only after user confirms the preview"),
        idempotencyKey: z.string().optional(),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("sendTeamsMessage", options, async (input) => {
        const { recipientName, recipientEmail, message, confirmed } = input;

        // Resolve person → user_profiles ID
        const query = supabase
          .from("people")
          .select("id, first_name, last_name, email")
          .limit(5);

        if (recipientEmail) {
          query.ilike("email", recipientEmail);
        } else {
          // Try first+last split
          const parts = recipientName.trim().split(/\s+/);
          if (parts.length >= 2) {
            query.ilike("first_name", `%${parts[0]}%`).ilike("last_name", `%${parts[parts.length - 1]}%`);
          } else {
            query.or(`first_name.ilike.%${parts[0]}%,last_name.ilike.%${parts[0]}%`);
          }
        }

        const { data: people, error: peopleError } = await query;

        if (peopleError) {
          return { success: false, error: `Failed to look up recipient: ${peopleError.message}` };
        }

        if (!people || people.length === 0) {
          return {
            success: false,
            error: `No person found matching "${recipientName}". Check the name and try again.`,
          };
        }

        // Match to a Supabase user via email
        const emails = people.map((p) => p.email).filter(Boolean) as string[];
        const { data: userProfiles } = await supabase
          .from("user_profiles")
          .select("id, email")
          .in("email", emails)
          .limit(5);

        const userProfileMap = new Map((userProfiles ?? []).map((u) => [u.email, u.id]));
        const matchedPerson = people.find((p) => p.email && userProfileMap.has(p.email));
        const supabaseUserId = matchedPerson?.email ? userProfileMap.get(matchedPerson.email) ?? null : null;

        if (!supabaseUserId) {
          return {
            success: false,
            error:
              `Found ${people[0].first_name} ${people[0].last_name} in the directory but they don't have an Alleato login. ` +
              "They need an account and must have messaged the Archon bot in Teams to receive messages.",
          };
        }

        // Check Teams conversation ref exists
        const { data: ref } = await supabase
          .from("teams_conversation_refs")
          .select("supabase_user_id")
          .eq("supabase_user_id", supabaseUserId)
          .maybeSingle();

        if (!ref) {
          const name = [matchedPerson?.first_name, matchedPerson?.last_name].filter(Boolean).join(" ");
          return {
            success: false,
            error:
              `${name} hasn't linked their Teams account yet — they need to message the Archon bot in Teams at least once before they can receive proactive messages.`,
          };
        }

        const recipientFullName = [matchedPerson?.first_name, matchedPerson?.last_name]
          .filter(Boolean)
          .join(" ");

        if (!confirmed) {
          return {
            action: "preview",
            message: `I'll send this Teams message to **${recipientFullName}**. Reply **confirm** to send.`,
            preview: {
              recipient: recipientFullName,
              recipientEmail: matchedPerson?.email,
              platform: "Microsoft Teams",
              message,
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("sendTeamsMessage", input);
        const replay = await getReplayResponse("sendTeamsMessage", idempotencyKey);
        if (replay) return replay;

        const { sendProactiveMessage } = await import("@/lib/bot/teams-chat");
        await sendProactiveMessage(supabaseUserId, message);

        const response = {
          success: true,
          message: `Teams message sent to **${recipientFullName}**.`,
          recipient: recipientFullName,
          recipientEmail: matchedPerson?.email,
        };
        await recordWriteAudit({
          toolName: "sendTeamsMessage",
          idempotencyKey,
          projectId: null,
          input,
          status: "success",
          response,
        });
        return response;
      }),
    }),

  }; // end return

  return wrapToolSetWithOutboundActionPolicy(tools, {
    onTrace: options.onTrace,
  });
} // end createActionTools
