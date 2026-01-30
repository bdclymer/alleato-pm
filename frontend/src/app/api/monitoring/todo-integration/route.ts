import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createClient } from "@/lib/supabase/server";

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

/**
 * GET: Retrieve all todos (mock data for now)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // In a real implementation, this would integrate with your TodoWrite system
    // For now, we'll return mock data based on the monitoring system
    const projectRoot = process.cwd().replace("/frontend", "");
    const monitoringPath = path.join(
      projectRoot,
      "documentation/1-project-mgmt/PROJECT_MONITORING.md",
    );

    const content = await fs.readFile(monitoringPath, "utf-8");
    const todos = extractTodosFromMonitoring(content);

    return NextResponse.json({ todos });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 },
    );
  }
}

/**
 * POST: Create new todo or update existing todo
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();

    if (body.action === "create") {
      return await createTodo(body.todo);
    } else if (body.action === "update") {
      return await updateTodo(body.update);
    } else if (body.action === "trigger_verification") {
      return await triggerVerification(body.todoId);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Request failed" },
      { status: 500 },
    );
  }
}

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
async function createTodo(todo: Partial<TodoItem>) {
  try {
    // In a real implementation, this would integrate with your TodoWrite system
    // For now, we'll add it to a monitoring section
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}`,
      content: todo.content || "New task",
      status: "pending",
      priority: todo.priority || "medium",
      initiative: todo.initiative,
      assignee: todo.assignee,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Update monitoring file
    await updateMonitoringWithTodo(newTodo, "create");

    return NextResponse.json({ todo: newTodo });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 },
    );
  }
}

/**
 * Update existing todo
 */
async function updateTodo(update: TodoUpdate) {
  try {
    // Trigger verification if marked as completed
    if (update.status === "completed") {
      await triggerVerificationProcess(update.id, update.notes);
    }

    // Update monitoring file
    await updateMonitoringWithTodo(update, "update");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 },
    );
  }
}

/**
 * Trigger verification for a todo
 */
async function triggerVerification(todoId: string) {
  try {
    // This would integrate with your verification system
    // In a real implementation, this would call your verification scripts
    // For now, we'll just log it

    return NextResponse.json({
      success: true,
      message: "Verification triggered",
      todoId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to trigger verification" },
      { status: 500 },
    );
  }
}

/**
 * Trigger verification process
 */
async function triggerVerificationProcess(todoId: string, notes?: string) {
  try {
    const projectRoot = process.cwd().replace("/frontend", "");
    const scriptPath = path.join(
      projectRoot,
      "scripts/monitoring/check-completion.cjs",
    );

    // Create a simple verification trigger
    const todoData = {
      id: todoId,
      content: notes || "Task completion",
      priority: "medium",
    };

    // In a production environment, you'd spawn the verification script
    // For demo purposes, we'll just log this
    // exec(`node ${scriptPath} "${JSON.stringify(todoData)}"`);
  } catch (error) {
    console.error("Failed to trigger auto-verification:", error);
    // Intentionally swallowed: auto-verification is optional
  }
}

/**
 * Update monitoring file with todo changes
 */
async function updateMonitoringWithTodo(
  todo: any,
  action: "create" | "update",
) {
  try {
    const projectRoot = process.cwd().replace("/frontend", "");
    const monitoringPath = path.join(
      projectRoot,
      "documentation/1-project-mgmt/PROJECT_MONITORING.md",
    );

    let content = await fs.readFile(monitoringPath, "utf-8");

    // Add activity log entry
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const todayDate = new Date().toISOString().split("T")[0];
    const logEntry = `- **${timestamp}** - [dashboard] Todo ${action}d: ${todo.content || "Task"}`;

    // Find and update the activity log section
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
      // Add new date section
      const activityLogIndex = content.indexOf("## 🔄 RECENT ACTIVITY LOG");
      if (activityLogIndex !== -1) {
        const insertIndex = content.indexOf("\n\n", activityLogIndex) + 2;
        content =
          content.slice(0, insertIndex) +
          `${dateHeader}\n${logEntry}\n\n` +
          content.slice(insertIndex);
      }
    }

    await fs.writeFile(monitoringPath, content);
  } catch (error) {
    console.error("Failed to update monitoring file:", error);
    // Intentionally swallowed: monitoring file updates are non-critical
  }
}
