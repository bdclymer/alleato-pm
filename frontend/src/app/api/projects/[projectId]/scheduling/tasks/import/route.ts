/**
 * =============================================================================
 * SCHEDULE TASK IMPORT API
 * =============================================================================
 *
 * API endpoint for importing schedule tasks in bulk.
 * Accepts an array of task data and creates them in the database.
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient, getApiRouteUser } from "@/lib/supabase/server";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { ScheduleTaskCreate } from "@/types/scheduling";
import { validateScheduleTaskCreateInput } from "@/lib/scheduling/task-validation";

// =============================================================================
// POST - Import Tasks
// =============================================================================

interface ImportTaskData {
  name: string;
  external_id?: string;
  parent_external_id?: string | null;
  predecessor_external_ids?: string[];
  wbs_code?: string;
  start_date?: string;
  finish_date?: string;
  duration_days?: number;
  percent_complete?: number;
  status?: string;
  is_milestone?: boolean;
  sort_order?: number;
}

interface ImportRequest {
  tasks: ImportTaskData[];
  replaceExisting?: boolean;
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/scheduling/tasks/import#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const user = await getApiRouteUser();

    if (!user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/scheduling/tasks/import#POST", message: "Authentication required." });
    }

    const body: ImportRequest = await request.json();

    // Validate request
    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json(
        { error: "tasks must be a non-empty array" },
        { status: 400 }
      );
    }

    const validationErrors: Array<{ index: number; field: string; error: string }> = [];
    body.tasks.forEach((task, index) => {
      validateScheduleTaskCreateInput(task).forEach((error) => {
        validationErrors.push({ index, ...error });
      });
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    const service = new SchedulingService(supabase);
    const results = {
      imported: 0,
      deletedExisting: 0,
      failed: 0,
      errors: [] as Array<{ index: number; name: string; error: string }>,
    };

    // Get current max sort order
    const existingTasksResult = await service.listTasks(projectId, { limit: 10000 });
    let maxSortOrder = 0;
    if (existingTasksResult.data && existingTasksResult.data.length > 0) {
      maxSortOrder = Math.max(...existingTasksResult.data.map((t: { sort_order?: number }) => t.sort_order || 0));
    }

    if (body.replaceExisting && existingTasksResult.data.length > 0) {
      if (existingTasksResult.pagination.total_records > existingTasksResult.data.length) {
        throw new Error("Schedule replacement is blocked because not all existing tasks could be loaded.");
      }

      const existingTaskIds = existingTasksResult.data.map((task) => task.id);

      const { error: dependencyTaskError } = await supabase
        .from("schedule_dependencies")
        .delete()
        .in("task_id", existingTaskIds);
      if (dependencyTaskError) {
        throw new Error(`Failed to clear existing schedule dependencies: ${dependencyTaskError.message}`);
      }

      const { error: dependencyPredecessorError } = await supabase
        .from("schedule_dependencies")
        .delete()
        .in("predecessor_task_id", existingTaskIds);
      if (dependencyPredecessorError) {
        throw new Error(`Failed to clear existing schedule dependencies: ${dependencyPredecessorError.message}`);
      }

      const { error: deadlineError } = await supabase
        .from("schedule_deadlines")
        .delete()
        .in("task_id", existingTaskIds);
      if (deadlineError) {
        throw new Error(`Failed to clear existing schedule deadlines: ${deadlineError.message}`);
      }

      const { error: deleteTasksError } = await supabase
        .from("schedule_tasks")
        .delete()
        .eq("project_id", Number(projectId));
      if (deleteTasksError) {
        throw new Error(`Failed to replace existing schedule tasks: ${deleteTasksError.message}`);
      }

      results.deletedExisting = existingTaskIds.length;
      maxSortOrder = 0;
    }

    const importedTaskIdsByExternalId = new Map<string, string>();
    const dependencyRows: Array<{ task_id: string; predecessor_task_id: string; dependency_type: string; lag_days: number }> = [];

    // Import each task in request order so parent_external_id references can map
    // Microsoft Project outline hierarchy without adding source columns yet.
    for (let i = 0; i < body.tasks.length; i++) {
      const taskData = body.tasks[i];

      try {
        const parentTaskId =
          taskData.parent_external_id
            ? importedTaskIdsByExternalId.get(taskData.parent_external_id) ?? null
            : null;

        const createData: ScheduleTaskCreate = {
          name: taskData.name.trim(),
          project_id: Number(projectId),
          parent_task_id: parentTaskId,
          wbs_code: taskData.wbs_code || null,
          start_date: taskData.start_date || null,
          finish_date: taskData.finish_date || null,
          duration_days: taskData.duration_days ?? null,
          percent_complete: taskData.percent_complete ?? 0,
          status: (taskData.status as "not_started" | "in_progress" | "complete") || "not_started",
          is_milestone: taskData.is_milestone ?? false,
          constraint_type: null,
          constraint_date: null,
          sort_order: taskData.sort_order ?? maxSortOrder + i + 1,
        };

        const importedTask = await service.createTask(projectId, createData);
        if (taskData.external_id) {
          importedTaskIdsByExternalId.set(taskData.external_id, importedTask.id);
        }
        for (const predecessorExternalId of taskData.predecessor_external_ids ?? []) {
          const predecessorTaskId = importedTaskIdsByExternalId.get(predecessorExternalId);
          if (!predecessorTaskId) continue;
          dependencyRows.push({
            task_id: importedTask.id,
            predecessor_task_id: predecessorTaskId,
            dependency_type: "finish_to_start",
            lag_days: 0,
          });
        }
        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          name: taskData.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (dependencyRows.length > 0) {
      const { error: dependencyInsertError } = await supabase
        .from("schedule_dependencies")
        .insert(dependencyRows);
      if (dependencyInsertError) {
        throw new Error(`Imported tasks, but failed to create schedule dependencies: ${dependencyInsertError.message}`);
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.imported} imported, ${results.failed} failed`,
      dependenciesImported: dependencyRows.length,
      ...results,
    });
    },
);
