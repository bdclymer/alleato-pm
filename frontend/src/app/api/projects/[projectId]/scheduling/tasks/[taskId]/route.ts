/**
 * =============================================================================
 * SCHEDULE TASK CRUD API ENDPOINTS
 * =============================================================================
 *
 * RESTful API endpoints for individual Schedule Task operations
 * Supports:
 * - Get single task with details
 * - Update task
 * - Delete task
 */

import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { ScheduleTaskUpdate } from "@/types/scheduling";

// =============================================================================
// GET - Fetch Single Schedule Task
// =============================================================================

export const GET = withApiGuardrails<{ projectId: string; taskId: string }>(
  "projects/[projectId]/scheduling/tasks/[taskId]#GET",
  async ({ request, params }) => {
  
    const { projectId, taskId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/scheduling/tasks/[taskId]#GET", message: "Authentication required." });
    }

    const service = new SchedulingService(supabase);
    const task = await service.getTaskById(projectId, taskId);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: task });
    },
);

// =============================================================================
// PUT - Update Schedule Task
// =============================================================================

export const PUT = withApiGuardrails<{ projectId: string; taskId: string }>(
  "projects/[projectId]/scheduling/tasks/[taskId]#PUT",
  async ({ request, params }) => {
  
    const { projectId, taskId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/scheduling/tasks/[taskId]#PUT", message: "Authentication required." });
    }

    const body = await request.json();

    // Validate name if provided
    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim() === "")) {
      return NextResponse.json(
        { error: "Task name cannot be empty" },
        { status: 400 }
      );
    }

    // Validate date constraints if both are provided
    if (body.start_date && body.finish_date) {
      const start = new Date(body.start_date);
      const finish = new Date(body.finish_date);
      if (start > finish) {
        return NextResponse.json(
          { error: "Start date cannot be after finish date" },
          { status: 400 }
        );
      }
    }

    // Validate milestone constraints
    if (body.is_milestone && body.duration_days && body.duration_days !== 0) {
      return NextResponse.json(
        { error: "Milestones must have zero duration" },
        { status: 400 }
      );
    }

    // Validate percent_complete if provided
    if (body.percent_complete !== undefined) {
      if (body.percent_complete < 0 || body.percent_complete > 100) {
        return NextResponse.json(
          { error: "Percent complete must be between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // Build update data - only include provided fields
    const updateData: ScheduleTaskUpdate = {};

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.parent_task_id !== undefined) updateData.parent_task_id = body.parent_task_id;
    if (body.start_date !== undefined) updateData.start_date = body.start_date;
    if (body.finish_date !== undefined) updateData.finish_date = body.finish_date;
    if (body.duration_days !== undefined) updateData.duration_days = body.duration_days;
    if (body.percent_complete !== undefined) updateData.percent_complete = body.percent_complete;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.is_milestone !== undefined) updateData.is_milestone = body.is_milestone;
    if (body.constraint_type !== undefined) updateData.constraint_type = body.constraint_type;
    if (body.constraint_date !== undefined) updateData.constraint_date = body.constraint_date;
    if (body.wbs_code !== undefined) updateData.wbs_code = body.wbs_code;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const service = new SchedulingService(supabase);
    const task = await service.updateTask(projectId, taskId, updateData);

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: task });
    },
);

// =============================================================================
// DELETE - Delete Schedule Task
// =============================================================================

export const DELETE = withApiGuardrails<{ projectId: string; taskId: string }>(
  "projects/[projectId]/scheduling/tasks/[taskId]#DELETE",
  async ({ request, params }) => {
  
    const { projectId, taskId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "projects/[projectId]/scheduling/tasks/[taskId]#DELETE", message: "Authentication required." });
    }

    const service = new SchedulingService(supabase);
    const deleted = await service.deleteTask(projectId, taskId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Task deleted successfully",
      id: taskId,
    });
    },
);
