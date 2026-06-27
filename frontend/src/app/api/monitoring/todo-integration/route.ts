import { parseJsonBody, withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getApiRouteUser } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * TodoWrite integration endpoint
 * Allows the dashboard to interact with TodoWrite data
 */

// Types for TodoWrite integration
interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in-progress" | "completed";
  priority: "high" | "medium" | "low";
  initiative?: string;
  assignee?: string;
  created: string;
  updated: string;
  verification?: "pending" | "verified" | "failed";
}

interface TodoUpdate {
  id: string;
  status: "pending" | "in-progress" | "completed";
  notes?: string;
}

const createTodoSchema = z.object({
  content: z.string().trim().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  initiative: z.string().trim().min(1).optional(),
  assignee: z.string().trim().min(1).optional(),
});

const updateTodoSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["pending", "in-progress", "completed"]),
  notes: z.string().trim().min(1).optional(),
});

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), todo: createTodoSchema }),
  z.object({ action: z.literal("update"), update: updateTodoSchema }),
  z.object({ action: z.literal("trigger_verification"), todoId: z.string().trim().min(1) }),
]);

type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const GET = withApiGuardrails(
  "monitoring/todo-integration#GET",
  async () => {
  
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "monitoring/todo-integration#GET", message: "Authentication required." });
    }
    const projectRoot = process.cwd().replace("/frontend", "");
    const monitoringPath = path.join(
      projectRoot,
      "documentation/1-project-mgmt/PROJECT_MONITORING.md",
    );

    const content = await fs.readFile(monitoringPath, "utf-8");
    const todos = extractTodosFromMonitoring(content);

    return NextResponse.json({ todos });
    },
);

/**
 * POST: Create new todo or update existing todo
 */
export const POST = withApiGuardrails(
  "monitoring/todo-integration#POST",
  async ({ request }) => {
  
    const user = await getApiRouteUser();
    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "monitoring/todo-integration#POST", message: "Authentication required." });
    }
    const body = await parseJsonBody(
      request,
      requestSchema,
      "monitoring/todo-integration#POST",
    );

    if (body.action === "create") {
      return await createTodo(body.todo);
    } else if (body.action === "update") {
      return await updateTodo(body.update);
    } else if (body.action === "trigger_verification") {
      return await triggerVerification(body.todoId);
    }

    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where: "monitoring/todo-integration#POST",
      message: "Unsupported todo action.",
      status: 400,
    });
    },
);

/**
 * Extract todos from monitoring content
 */
function extractTodosFromMonitoring(content: string): TodoItem[] {
  const todos: TodoItem[] = [];

  // Extract todos from success criteria sections
  const initiativeRegex =
    /## INITIATIVE: (.*?)\n.*?### Success Criteria\n([\s\S]*?)(?=\n###)/g;
  let match;

  while ((match = initiativeRegex.exec(content)) !== null) {
    const [, initiativeName, criteriaSection] = match;
    const criteriaLines = criteriaSection
      .split("\n")
      .filter((line) => line.includes("- ["));

    criteriaLines.forEach((line, index) => {
      const isCompleted = line.includes("- [x]");
      const content = line.replace(/- \[.\] /, "").trim();

      if (content) {
        todos.push({
          id: `${initiativeName.toLowerCase().replace(/\s+/g, "-")}-${index}`,
          content,
          status: isCompleted ? "completed" : "pending",
          priority: "medium",
          initiative: initiativeName,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          verification: isCompleted ? "verified" : undefined,
        });
      }
    });
  }

  return todos;
}

/**
 * Create new todo
 */
async function createTodo(todo: CreateTodoInput) {
  const newTodo: TodoItem = {
    id: `todo-${Date.now()}`,
    content: todo.content,
    status: "pending",
    priority: todo.priority,
    initiative: todo.initiative,
    assignee: todo.assignee,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  await updateMonitoringWithTodo(newTodo, "create");

  return NextResponse.json({ todo: newTodo });
}

/**
 * Update existing todo
 */
async function updateTodo(update: TodoUpdate) {
  if (update.status === "completed") {
    await triggerVerificationProcess(update.id, update.notes);
  }

  await updateMonitoringWithTodo(update, "update");

  return NextResponse.json({ success: true });
}

/**
 * Trigger verification for a todo
 */
async function triggerVerification(todoId: string): Promise<Response> {
  throw new GuardrailError({
    code: "NOT_IMPLEMENTED",
    where: "monitoring/todo-integration#triggerVerification",
    message: `Todo verification is not wired to an executable verification runner for ${todoId}.`,
    status: 501,
  });
}

/**
 * Trigger verification process
 */
async function triggerVerificationProcess(todoId: string, notes?: string) {
  const projectRoot = process.cwd().replace("/frontend", "");
  const scriptPath = path.join(projectRoot, "scripts/monitoring/check-completion.cjs");
  await fs.access(scriptPath);
  throw new GuardrailError({
    code: "NOT_IMPLEMENTED",
    where: "monitoring/todo-integration#triggerVerificationProcess",
    message: "Todo completion verification script exists but is not wired for API execution.",
    status: 501,
    details: { todoId, notesProvided: Boolean(notes) },
  });
}

/**
 * Update monitoring file with todo changes
 */
async function updateMonitoringWithTodo(
  todo: Pick<TodoItem, "content"> | TodoUpdate,
  action: "create" | "update",
) {
  const projectRoot = process.cwd().replace("/frontend", "");
  const monitoringPath = path.join(
    projectRoot,
    "documentation/1-project-mgmt/PROJECT_MONITORING.md",
  );

  let content = await fs.readFile(monitoringPath, "utf-8");

  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const todayDate = new Date().toISOString().split("T")[0];
  const todoDescription = "content" in todo ? todo.content : todo.id;
  const logEntry = `- **${timestamp}** - [dashboard] Todo ${action}d: ${todoDescription}`;

  const dateHeader = `### ${todayDate}`;

  if (content.includes(dateHeader)) {
    const dateIndex = content.indexOf(dateHeader);
    const nextHeaderIndex = content.indexOf("\n### ", dateIndex + 1);
    const insertIndex =
      nextHeaderIndex === -1 ? content.length : nextHeaderIndex;

    content =
      content.slice(0, insertIndex).trimEnd() +
      `\n${logEntry}` +
      content.slice(insertIndex);
  } else {
    const activityLogIndex = content.indexOf("## 🔄 RECENT ACTIVITY LOG");
    if (activityLogIndex === -1) {
      throw new GuardrailError({
        code: "SCHEMA_MISMATCH",
        where: "monitoring/todo-integration#updateMonitoringWithTodo",
        message: "Monitoring file is missing the RECENT ACTIVITY LOG section.",
        status: 500,
        details: { monitoringPath },
      });
    }
    const insertIndex = content.indexOf("\n\n", activityLogIndex) + 2;
    content =
      content.slice(0, insertIndex) +
      `${dateHeader}\n${logEntry}\n\n` +
      content.slice(insertIndex);
  }

  await fs.writeFile(monitoringPath, content);
}
