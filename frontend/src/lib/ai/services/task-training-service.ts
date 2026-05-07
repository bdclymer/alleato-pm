import { createServiceClient } from "@/lib/supabase/service";
import { upsertAgentLearning } from "@/lib/ai/services/agent-learning-service";
import type { Database } from "@/types/database.types";
import { logger } from "@/lib/logger";
import {
  TASK_FEEDBACK_REASON_CATEGORIES,
  TASK_FEEDBACK_REASON_LABELS,
  type FewShotTask,
  type TaskFeedbackReasonCategory,
  type TaskSnapshot,
} from "@/lib/ai/task-feedback-types";

type AiTaskFeedbackRow = Database["public"]["Tables"]["ai_task_feedback"]["Row"];
export {
  TASK_FEEDBACK_REASON_CATEGORIES,
  TASK_FEEDBACK_REASON_LABELS,
  type FewShotTask,
  type TaskFeedbackReasonCategory,
  type TaskSnapshot,
} from "@/lib/ai/task-feedback-types";

export interface RecordTaskFeedbackParams {
  userId: string;
  projectId?: number | null;
  taskId?: string | null;
  signal: "good" | "bad";
  reasonCategory?: TaskFeedbackReasonCategory | null;
  reason?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
}

const TASK_GENERATION_TERMS = [
  /\badd (a )?task\b/i,
  /\bcreate (a )?task\b/i,
  /\bgenerate (a )?task\b/i,
  /\bmake (a )?task\b/i,
  /\bassign\b/i,
  /\baction item\b/i,
  /\bto-?do\b/i,
  /\bfollow[- ]?up\b/i,
  /\bremind me\b/i,
];

export function shouldLoadTaskTrainingContext(messageText: string): boolean {
  const normalized = messageText.trim();
  if (!normalized) return false;
  return TASK_GENERATION_TERMS.some((pattern) => pattern.test(normalized));
}

function formatFewShotTaskLine(ex: FewShotTask, index: number): string {
  const details = [`priority: ${ex.priority}`];
  if (ex.assignee) details.push(`assignee: ${ex.assignee}`);
  if (ex.dueDate) details.push(`due: ${ex.dueDate}`);
  if (ex.notes) details.push(`notes: ${ex.notes}`);
  return `${index + 1}. "${ex.name}" (${details.join(", ")})`;
}

export function formatTaskGenerationTrainingBlock(examples: FewShotTask[]): string {
  if (examples.length === 0) return "";

  return [
    "## Task Generation Feedback",
    "",
    "Users promoted these AI-generated tasks as good examples. Before calling createTask, use them as quality constraints for specificity, assignee fit, priority, and due-date shape. Do not copy an example unless the user asks for that exact task.",
    "",
    ...examples.map(formatFewShotTaskLine),
  ].join("\n");
}

async function extractBadTaskLearning({
  feedbackId,
  taskSnapshot,
  reasonCategory,
  reason,
  projectId,
}: {
  feedbackId: string;
  taskSnapshot: TaskSnapshot;
  reasonCategory?: TaskFeedbackReasonCategory | null;
  reason?: string | null;
  projectId?: number | null;
}): Promise<void> {
  const parts: string[] = [`Task: "${taskSnapshot.name}"`, `Priority: ${taskSnapshot.priority}`];
  if (taskSnapshot.assignee) parts.push(`Assignee: ${taskSnapshot.assignee}`);
  if (taskSnapshot.dueDate) parts.push(`Due: ${taskSnapshot.dueDate}`);
  if (taskSnapshot.notes) parts.push(`Notes: ${taskSnapshot.notes}`);
  const taskDescription = parts.join(". ");

  const categoryLabel = reasonCategory
    ? TASK_FEEDBACK_REASON_LABELS[reasonCategory]
    : null;
  const feedbackReason = [
    categoryLabel ? `Category: ${categoryLabel}.` : null,
    reason ? `User note: "${reason}".` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const preventionPrompt = feedbackReason
    ? `Avoid tasks like this. User rated it negatively. ${feedbackReason} ${taskDescription}`
    : `Avoid generating tasks similar to this one. User rated it negatively. ${taskDescription}`;

  const learning = await upsertAgentLearning({
    title: `Bad task: "${taskSnapshot.name.slice(0, 80)}"`,
    source: "thumbs_down",
    status: "candidate",
    problemSignature: `bad_task ${reasonCategory ?? "uncategorized"} ${taskSnapshot.name.toLowerCase().slice(0, 60)}`,
    symptoms: feedbackReason ? `${taskDescription}. ${feedbackReason}` : taskDescription,
    preventionPrompt,
    scopeTags: [
      "task",
      "createTask",
      "schedule",
      ...(reasonCategory ? [reasonCategory] : []),
    ],
    projectId,
    confidence: 0.6,
    evidence: { feedbackId, reasonCategory, reason, taskSnapshot },
  });

  if (learning) {
    const supabase = createServiceClient();
    await supabase
      .from("ai_task_feedback")
      .update({ learning_id: learning.id })
      .eq("id", feedbackId);
  }
}

export async function recordTaskFeedback(
  params: RecordTaskFeedbackParams
): Promise<{ id: string }> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ai_task_feedback")
    .insert({
      user_id: params.userId,
      project_id: params.projectId ?? null,
      generated_task_id: params.taskId ?? null,
      signal: params.signal,
      reason_category: params.reasonCategory ?? null,
      reason: params.reason ?? null,
      task_snapshot: params.taskSnapshot as unknown as Database["public"]["Tables"]["ai_task_feedback"]["Insert"]["task_snapshot"],
      session_id: params.sessionId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to record task feedback: ${error?.message ?? "no data returned"}`);
  }

  if (params.signal === "bad") {
    extractBadTaskLearning({
      feedbackId: data.id,
      taskSnapshot: params.taskSnapshot,
      reasonCategory: params.reasonCategory,
      reason: params.reason,
      projectId: params.projectId,
    }).catch((err: unknown) => {
      logger.error({ msg: "[TaskFeedback] Learning extraction failed (non-fatal)", error: err });
    });
  }

  return { id: data.id };
}

export async function getPositiveFewShotExamples(
  projectId?: number | null,
  limit = 3
): Promise<FewShotTask[]> {
  try {
    const supabase = createServiceClient();
    let query = supabase
      .from("ai_task_feedback")
      .select("task_snapshot")
      .eq("signal", "good")
      .eq("promoted", true)
      .order("created_at", { ascending: false });

    query =
      typeof projectId === "number"
        ? query.or(`project_id.is.null,project_id.eq.${projectId}`)
        : query.is("project_id", null);

    const { data, error } = await query.limit(limit);

    if (error || !data) return [];

    return data.map((row) => {
      const snap = row.task_snapshot as unknown as TaskSnapshot;
      return {
        name: snap.name,
        assignee: snap.assignee ?? null,
        dueDate: snap.dueDate ?? null,
        priority: snap.priority,
        notes: snap.notes ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function buildTaskFewShotBlock(projectId: number): Promise<string> {
  const examples = await getPositiveFewShotExamples(projectId);
  if (examples.length === 0) return "";

  const lines = examples.map((ex, i) => {
    let line = `Example ${i + 1}: "${ex.name}"`;
    line += ` (priority: ${ex.priority})`;
    if (ex.assignee) line += ` — assigned to ${ex.assignee}`;
    if (ex.dueDate) line += `, due ${ex.dueDate}`;
    return line;
  });

  return `\n\n### Well-rated task examples for this project (aim for similar quality):\n${lines.join("\n")}`;
}

export async function buildTaskGenerationTrainingBlock(params: {
  projectId?: number | null;
  limit?: number;
}): Promise<string> {
  const examples = await getPositiveFewShotExamples(
    params.projectId ?? null,
    params.limit ?? 3,
  );
  return formatTaskGenerationTrainingBlock(examples);
}

export async function getAllTaskFeedback(params: {
  projectId?: number;
  signal?: "good" | "bad";
  limit?: number;
  offset?: number;
}): Promise<AiTaskFeedbackRow[]> {
  try {
    const supabase = createServiceClient();
    const limit = params.limit ?? 50;
    const offset = params.offset ?? 0;

    let query = supabase
      .from("ai_task_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.projectId !== undefined) {
      query = query.eq("project_id", params.projectId);
    }
    if (params.signal !== undefined) {
      query = query.eq("signal", params.signal);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function promoteTaskFeedback(feedbackId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_task_feedback")
    .update({ promoted: true })
    .eq("id", feedbackId)
    .eq("signal", "good");

  if (error) {
    throw new Error(`Failed to promote task feedback: ${error.message}`);
  }
}

export async function demoteTaskFeedback(feedbackId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("ai_task_feedback")
    .update({ promoted: false })
    .eq("id", feedbackId);

  if (error) {
    throw new Error(`Failed to demote task feedback: ${error.message}`);
  }
}
