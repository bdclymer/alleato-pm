/**
 * =============================================================================
 * SCHEDULING TASKS API ENDPOINTS
 * =============================================================================
 *
 * RESTful API endpoints for Schedule Tasks operations
 * Supports:
 * - List tasks with filtering, pagination, sorting
 * - Create new tasks
 * - Get task hierarchy
 * - Get Gantt chart data
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SchedulingService } from "@/lib/services/scheduling-service";
import { ScheduleTaskListParams, ScheduleTaskCreate } from "@/types/scheduling";
import { apiErrorResponse } from "@/lib/api-error";

// =============================================================================
// GET - Fetch Schedule Tasks
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const service = new SchedulingService(supabase);

    // Handle different view modes
    const view = searchParams.get("view");

    if (view === "hierarchy") {
      const hierarchy = await service.getTasksHierarchy(projectId);
      return NextResponse.json({ data: hierarchy });
    }

    if (view === "gantt") {
      const ganttData = await service.getGanttData(projectId);
      return NextResponse.json({ data: ganttData });
    }

    if (view === "summary") {
      const summary = await service.getSummary(projectId);
      return NextResponse.json({ data: summary });
    }

    // Parse query parameters for list view
    const listParams: ScheduleTaskListParams = {
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "50"),
      sort: (searchParams.get("sort") as ScheduleTaskListParams["sort"]) || "sort_order",
      order: (searchParams.get("order") as "asc" | "desc") || "asc",
      status: searchParams.get("status") as ScheduleTaskListParams["status"],
      is_milestone: searchParams.get("is_milestone") === "true" ? true : undefined,
      search: searchParams.get("search") || undefined,
    };

    // Handle parent_task_id (can be null for root tasks)
    const parentTaskId = searchParams.get("parent_task_id");
    if (parentTaskId === "null") {
      listParams.parent_task_id = null;
    } else if (parentTaskId) {
      listParams.parent_task_id = parentTaskId;
    }

    const result = await service.listTasks(projectId, listParams);

    // Include summary if requested
    const includeSummary = searchParams.get("include_summary") === "true";
    if (includeSummary) {
      const summary = await service.getSummary(projectId);
      return NextResponse.json({
        ...result,
        summary,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch schedule tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule tasks" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create New Schedule Task
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - please log in" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Basic validation
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { error: "Task name is required" },
        { status: 400 }
      );
    }

    // Validate date constraints
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

    const taskData: ScheduleTaskCreate = {
      project_id: Number(projectId),
      name: body.name.trim(),
      parent_task_id: body.parent_task_id || null,
      start_date: body.start_date || null,
      finish_date: body.finish_date || null,
      duration_days: body.duration_days ?? null,
      percent_complete: body.percent_complete ?? 0,
      status: body.status || "not_started",
      is_milestone: body.is_milestone || false,
      constraint_type: body.constraint_type || null,
      constraint_date: body.constraint_date || null,
      wbs_code: body.wbs_code || null,
      sort_order: body.sort_order,
    };

    const service = new SchedulingService(supabase);
    const task = await service.createTask(projectId, taskData);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Failed to create schedule task:", error);

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // RLS policy violation - user not authorized for this project
      if (message.includes("new row violates row-level security") ||
          message.includes("rls") ||
          message.includes("policy")) {
        // Include project ID for debugging
        const { projectId: pid } = await params;
        return NextResponse.json(
          {
            error: `You don't have permission to create tasks in project ${pid}. You need to be added as a team member to this project.`,
            code: "PERMISSION_DENIED",
            projectId: pid
          },
          { status: 403 }
        );
      }

      // Foreign key violation - invalid parent task
      if (message.includes("foreign key") || message.includes("violates foreign key")) {
        return NextResponse.json(
          {
            error: "Invalid parent task reference. The parent task may have been deleted.",
            code: "INVALID_REFERENCE"
          },
          { status: 400 }
        );
      }

      // Authentication required
      if (message.includes("authentication required") || message.includes("not authenticated")) {
        return NextResponse.json(
          {
            error: "You must be logged in to create tasks. Please sign in and try again.",
            code: "AUTH_REQUIRED"
          },
          { status: 401 }
        );
      }

      // All other errors (validation, unknown, etc.)
      return apiErrorResponse(error);
    }

    return NextResponse.json(
      {
        error: "An unexpected error occurred while creating the task. Please try again.",
        code: "UNKNOWN_ERROR"
      },
      { status: 500 }
    );
  }
}
