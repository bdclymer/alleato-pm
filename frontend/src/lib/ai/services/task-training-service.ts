import { createServiceClient } from "@/lib/supabase/service";
import { upsertAgentLearning } from "@/lib/ai/services/agent-learning-service";
import type { Database } from "@/types/database.types";

type AiTaskFeedbackRow = Database["public"]["Tables"]["ai_task_feedback"]["Row"];

export interface TaskSnapshot {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
  projectId: number;
}

export interface FewShotTask {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
}

export interface RecordTaskFeedbackParams {
  userId: string;
  projectId: number;
  taskId?: string | null;
  signal: "good" | "bad";
  reason?: string | null;
  taskSnapshot: TaskSnapshot;
  sessionId?: string | null;
}

async function extractBadTaskLearning({
  feedbackId,
  taskSnapshot,
  reason,
  projectId,
}: {
  feedbackId: string;
  taskSnapshot: TaskSnapshot;
  reason?: string | null;
  projectId: number;
}): Promise<void> {
  const parts: string[] = [`Task: "${taskSnapshot.name}"`, `Priority: ${taskSnapshot.priority}`];
  if (taskSnapshot.assignee) parts.push(`Assignee: ${taskSnapshot.assignee}`);
  if (taskSnapshot.dueDate) parts.push(`Due: ${taskSnapshot.dueDate}`);
  if (taskSnapshot.notes) parts.push(`Notes: ${taskSnapshot.notes}`);
  const taskDescription = parts.join(". ");

  const preventionPrompt = reason
    ? `Avoid tasks like this. User rated it negatively with reason: "${reason}". ${taskDescription}`
    : `Avoid generating tasks similar to this one. User rated it negatively. ${taskDescription}`;

  const learning = await upsertAgentLearning({
    title: `Bad task: "${taskSnapshot.name.slice(0, 80)}"`,
    source: "thumbs_down",
    status: "candidate",
    problemSignature: `bad_task ${taskSnapshot.name.toLowerCase().slice(0, 60)}`,
    symptoms: reason ? `${taskDescription}. User reason: ${reason}` : taskDescription,
    preventionPrompt,
    scopeTags: ["task", "createTask", "schedule"],
    projectId,
    confidence: 0.6,
    evidence: { feedbackId, taskSnapshot },
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
      project_id: params.projectId,
      task_id: params.taskId ?? null,
      signal: params.signal,
      reason: params.reason ?? null,
      task_snapshot: params.taskSnapshot as Database["public"]["Tables"]["ai_task_feedback"]["Insert"]["task_snapshot"],
      session_id: params.sessionId ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to record task feedback: ${error?.message ?? "no data returned"}`);
  }

  if (params.signal === "bad") {
    await extractBadTaskLearning({
      feedbackId: data.id,
      taskSnapshot: params.taskSnapshot,
      reason: params.reason,
      projectId: params.projectId,
    });
  }

  return { id: data.id };
}

export async function getPositiveFewShotExamples(
  projectId: number,
  limit = 3
): Promise<FewShotTask[]> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("ai_task_feedback")
      .select("task_snapshot")
      .eq("signal", "good")
      .eq("promoted", true)
      .or(`project_id.is.null,project_id.eq.${projectId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => {
      const snap = row.task_snapshot as TaskSnapshot;
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
    if (ex.priority !== "normal") line += ` (priority: ${ex.priority})`;
    if (ex.assignee) line += ` — assigned to ${ex.assignee}`;
    if (ex.dueDate) line += `, due ${ex.dueDate}`;
    return line;
  });

  return `\n\n### Well-rated task examples for this project (aim for similar quality):\n${lines.join("\n")}`;
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
