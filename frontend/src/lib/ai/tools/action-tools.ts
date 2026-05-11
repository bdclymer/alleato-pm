/**
 * Action Tools — The Write Layer (continued)
 *
 * IMPORTANT: Copy this full file to action-tools.ts — it replaces the stub above.
 * Split into two writes due to file size.
 */

import { tool } from "ai";
import { z } from "zod";
import { createHash, randomUUID } from "crypto";
import type { Json } from "@/types/database.types";
import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "./guardrails";
import { type ToolTracePayload, getOpenAI, withWriteTrace } from "./tool-utils";
import { buildAdminFeedbackTitle } from "@/lib/admin-feedback/title";
import { createGitHubIssue } from "@/lib/admin-feedback/github";
import { matchFeedbackToTool } from "@/lib/admin-feedback/tool-matcher";
import { resolveToolContext, contextToAgentPayload } from "@/lib/admin-feedback/context-resolver";
import { ingestAdminFeedbackLearning } from "@/lib/ai/services/agent-learning-service";
import { buildTaskFewShotBlock } from "@/lib/ai/services/task-training-service";

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

  const output = {
    action: "preview",
    message: "Here's the RFI I'll create. Reply **confirm** to proceed.",
    preview: {
      table: "rfis",
      fields: {
        project_id: input.projectId,
        subject: input.subject,
        question: input.question,
        ball_in_court: input.ballInCourt,
        due_date: input.dueDate,
        cost_impact: input.costImpact ?? "tbd",
        schedule_impact: input.scheduleImpact ?? "tbd",
        status: "open",
        is_private: false,
      },
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

  return {

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
        contractId: z.number().optional().describe("Prime contract ID if known"),
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
            contract_id: contractId != null ? String(contractId) : null,
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
      description:
        "Log a new change event — a potential scope change that may or may not " +
        "become a change order. Use when the user says 'log a change event', " +
        "'something came up on [project]', or describes an unexpected field condition. " +
        "Always preview before writing.",
      inputSchema: z.object({
        projectId: z.number().describe("Project ID — required"),
        title: z.string().describe("Short descriptive title"),
        description: z.string().optional().describe("Detailed description"),
        scope: z
          .enum(["owner_change", "unforeseen_condition", "design_error", "other"])
          .default("other"),
        type: z.enum(["potential_change", "trend", "rfi_answer_required"]).default("potential_change"),
        status: z.enum(["open", "in_review", "approved", "rejected", "void"]).default("open"),
        confirmed: z.boolean().default(false),
        idempotencyKey: z
          .string()
          .optional()
          .describe("Optional idempotency key to prevent duplicate writes"),
      }),
      needsApproval: needsConfirmedWriteApproval,
      execute: withWriteTrace("createChangeEvent", options, async (input) => {
        const { projectId, title, description, scope, type, status, confirmed } = input;
        const access = await enforceProjectWriteAccess(projectId);
        if (!access.ok) return { success: false, error: access.error };

        if (!confirmed) {
          return {
            action: "preview",
            message: "Here's the change event I'll create. Reply **confirm** to proceed.",
            preview: {
              table: "change_events",
              fields: { project_id: projectId, title, description, scope, type, status },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createChangeEvent", input);
        const replay = await getReplayResponse("createChangeEvent", idempotencyKey);
        if (replay) return replay;

        // change_events requires number and updated_at — generate them
        const { data: existing } = await supabase
          .from("change_events")
          .select("number")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastNumber = existing?.[0]?.number ?? "CE-000";
        const nextNum = String(parseInt(lastNumber.replace(/\D/g, "") || "0") + 1).padStart(3, "0");

        const { data, error } = await supabase
          .from("change_events")
          .insert({
            project_id: projectId,
            title,
            description: description ?? null,
            scope: scope,
            type,
            status,
            number: `CE-${nextNum}`,
            expecting_revenue: false,
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
          message: `Change event **${data.number} — "${title}"** logged.`,
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
        "Create an action item or task. Use when the user says 'add a task', " +
        "'assign [person] to [work]', or 'remind me to [action] by [date]'. " +
        "Always show a preview and ask for confirmation before writing.",
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
        "Create a task in the main Tasks page task register (public.tasks). " +
        "Use this for AI-generated follow-ups, action items, or user-created tasks " +
        "that should appear on /tasks or /[projectId]/tasks. Preview before writing.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if the task belongs to a project"),
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
        const { projectId, title, description, assignee, dueDate, priority, status, confirmed } = input;
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

        const now = new Date().toISOString();
        const metadataId = randomUUID();
        const { error: metadataError } = await supabase.from("document_metadata").insert({
          id: metadataId,
          title: `AI assistant task: ${title}`,
          type: "ai_assistant_task",
          source_system: "ai_assistant",
          date: now,
          captured_at: now,
          project_id: effectiveProjectId,
          content: taskDescription,
          summary: taskDescription,
          source_metadata: {
            source: "ai_assistant",
            tool: "createGeneratedTask",
            user_id: userId,
          } as Json,
        });

        if (metadataError) {
          const failure = { success: false, error: metadataError.message };
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

        const { data, error } = await supabase
          .from("tasks")
          .insert({
            metadata_id: metadataId,
            title,
            description: taskDescription,
            status: normalizedStatus,
            due_date: dueDate ?? null,
            priority: normalizedPriority,
            project_id: effectiveProjectId,
            project_ids: effectiveProjectId ? [effectiveProjectId] : null,
            assignee_name: resolvedAssignee.assigneeName,
            assignee_email: resolvedAssignee.assigneeEmail,
            assignee_person_id: resolvedAssignee.assigneePersonId,
            source_system: "ai_assistant",
            extraction_source: "ai_assistant_chat",
            extraction_metadata: {
              source: "ai_assistant",
              tool: "createGeneratedTask",
              user_id: userId,
              idempotency_key: idempotencyKey,
            } as Json,
            updated_at: now,
          })
          .select("id,title,description,status,priority,due_date,project_id,assignee_name,assignee_email,created_at")
          .single();

        if (error) {
          const { error: cleanupError } = await supabase
            .from("document_metadata")
            .delete()
            .eq("id", metadataId);
          const failure = {
            success: false,
            error: cleanupError
              ? `Task insert failed: ${error.message}. Metadata cleanup also failed: ${cleanupError.message}`
              : error.message,
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

        if (!confirmed) {
          return {
            action: "preview",
            message: "I'll log this risk. Reply **confirm** to proceed.",
            preview: {
              table: "ai_insights",
              fields: { project_id: projectId, title, description, severity, insight_type: insightType, financial_impact: financialImpact, timeline_impact_days: timelineImpactDays, resolved: 0 },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("flagProjectRisk", input);
        const replay = await getReplayResponse("flagProjectRisk", idempotencyKey);
        if (replay) return replay;

        const { data, error } = await supabase
          .from("ai_insights")
          .insert({
            project_id: projectId,
            title,
            description,
            severity,
            insight_type: insightType,
            financial_impact: financialImpact ?? null,
            timeline_impact_days: timelineImpactDays ?? null,
            resolved: 0,
          })
          .select("id, title, severity")
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
          record: data,
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
        status: z.enum(["pending", "submitted", "under_review", "approved", "rejected", "revise_resubmit"]).default("pending"),
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
              fields: { project_id: projectId, title, specification_section: specSection ?? null, final_due_date: dueDate ?? null, submitted_by: submittedBy, status },
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
            submitted_by: submittedBy,
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
            .select("id, name, phase, health_status, health_score, client, completion_percentage")
            .eq("id", projectId)
            .single();
          if (error || !data) return { success: false, error: `Project ${projectId} not found` };
          project = { id: data.id, name: data.name ?? "" };
        } else if (projectName) {
          const { data, error } = await supabase
            .from("projects")
            .select("id, name, phase, health_status, health_score, client, completion_percentage")
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
          .select("id, name, phase, health_status, health_score, client, completion_percentage, budget, budget_used, summary")
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

        const insightData = await supabase
          .from("ai_insights")
          .select("id, title, description, severity, insight_type, created_at")
          .eq("project_id", project.id)
          .eq("resolved", 0)
          .order("created_at", { ascending: false })
          .limit(10);

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
            client: proj?.client,
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
          activeRisks: insights.map(i => ({
            title: i.title,
            severity: i.severity,
            type: i.insight_type,
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
          return {
            action: "preview",
            message:
              `Here's the ${type === "subcontract" ? "subcontract" : "purchase order"} I'll create. ` +
              "Reply **confirm** to proceed or tell me what to change.",
            preview: {
              table,
              fields: {
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
              },
            },
          };
        }

        const idempotencyKey = resolveIdempotencyKey("createCommitment", input);
        const replay = await getReplayResponse("createCommitment", idempotencyKey);
        if (replay) return replay;

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

        const responseOut = {
          success: true,
          message: `${label} **${record.contract_number} — "${title}"** created successfully.`,
          record: data,
          nextSteps: [
            `Open the Commitments page to add SOV line items and set the contract value`,
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
} // end createActionTools
