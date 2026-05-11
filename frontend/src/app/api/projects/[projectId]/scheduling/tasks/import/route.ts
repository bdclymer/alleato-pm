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
import { createClient } from "@/lib/supabase/server";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { ScheduleTaskCreate } from "@/types/scheduling";
import { validateScheduleTaskCreateInput } from "@/lib/scheduling/task-validation";

// =============================================================================
// POST - Import Tasks
// =============================================================================

interface ImportTaskData {
  name: string;
  wbs_code?: string;
  start_date?: string;
  finish_date?: string;
  duration_days?: number;
  percent_complete?: number;
  status?: string;
  is_milestone?: boolean;
}

interface ImportRequest {
  tasks: ImportTaskData[];
}

export const POST = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/scheduling/tasks/import#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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
      failed: 0,
      errors: [] as Array<{ index: number; name: string; error: string }>,
    };

    // Get current max sort order
    const existingTasksResult = await service.listTasks(projectId, { limit: 1000 });
    let maxSortOrder = 0;
    if (existingTasksResult.data && existingTasksResult.data.length > 0) {
      maxSortOrder = Math.max(...existingTasksResult.data.map((t: { sort_order?: number }) => t.sort_order || 0));
    }

    // Import each task
    for (let i = 0; i < body.tasks.length; i++) {
      const taskData = body.tasks[i];

      try {
        const createData: ScheduleTaskCreate = {
          name: taskData.name.trim(),
          project_id: Number(projectId),
          parent_task_id: null,
          wbs_code: taskData.wbs_code || null,
          start_date: taskData.start_date || null,
          finish_date: taskData.finish_date || null,
          duration_days: taskData.duration_days ?? null,
          percent_complete: taskData.percent_complete ?? 0,
          status: (taskData.status as "not_started" | "in_progress" | "complete") || "not_started",
          is_milestone: taskData.is_milestone ?? false,
          constraint_type: null,
          constraint_date: null,
          sort_order: maxSortOrder + i + 1,
        };

        await service.createTask(projectId, createData);
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

    return NextResponse.json({
      message: `Import completed: ${results.imported} imported, ${results.failed} failed`,
      ...results,
    });
    },
);
