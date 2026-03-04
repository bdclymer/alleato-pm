/**
 * =============================================================================
 * SCHEDULING SERVICE LAYER
 * =============================================================================
 *
 * Business logic layer for Scheduling operations
 * Handles all database interactions, calculations, and business rules
 * Provides type-safe methods for the API layer
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  ScheduleTask,
  ScheduleTaskCreate,
  ScheduleTaskUpdate,
  ScheduleTaskBulkUpdate,
  ScheduleDependency,
  ScheduleDependencyCreate,
  ScheduleDeadline,
  ScheduleDeadlineCreate,
  ScheduleTaskListParams,
  SchedulePaginatedResponse,
  ScheduleSummary,
  ScheduleTaskWithHierarchy,
  GanttChartItem,
} from "@/types/scheduling";

export class SchedulingService {
  constructor(private supabase: SupabaseClient) {}

  // =============================================================================
  // TASK OPERATIONS
  // =============================================================================

  /**
   * List all tasks for a project with pagination and filtering
   */
  async listTasks(
    projectId: string,
    params: ScheduleTaskListParams = {}
  ): Promise<SchedulePaginatedResponse<ScheduleTask>> {
    const {
      page = 1,
      limit = 50,
      sort = "sort_order",
      order = "asc",
      status,
      parent_task_id,
      is_milestone,
      search,
    } = params;

    // Build the main query
    let query = this.supabase
      .from("schedule_tasks")
      .select("*", { count: "exact" })
      .eq("project_id", projectId);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (parent_task_id !== undefined) {
      if (parent_task_id === null) {
        query = query.is("parent_task_id", null);
      } else {
        query = query.eq("parent_task_id", parent_task_id);
      }
    }

    if (is_milestone !== undefined) {
      query = query.eq("is_milestone", is_milestone);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    // Apply sorting
    const sortField = this.mapSortField(sort);
    query = query.order(sortField, { ascending: order === "asc" });

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return {
      data: (data || []) as ScheduleTask[],
      pagination: {
        current_page: page,
        per_page: limit,
        total_records: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next_page: (count || 0) > offset + limit,
        has_prev_page: page > 1,
      },
    };
  }

  /**
   * Get tasks as a hierarchical tree structure
   */
  async getTasksHierarchy(projectId: string): Promise<ScheduleTaskWithHierarchy[]> {
    const { data, error } = await this.supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    const tasks = (data || []) as ScheduleTask[];
    return this.buildHierarchy(tasks);
  }

  /**
   * Get a single task by ID
   */
  async getTaskById(
    projectId: string,
    taskId: string
  ): Promise<ScheduleTask | null> {
    const { data, error } = await this.supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("id", taskId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data as ScheduleTask;
  }

  /**
   * Create a new task
   */
  async createTask(
    projectId: string,
    data: ScheduleTaskCreate
  ): Promise<ScheduleTask> {
    // Get current user
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Get max sort_order for the parent level
    const sortOrder = await this.getNextSortOrder(
      projectId,
      data.parent_task_id || null
    );

    const { data: task, error } = await this.supabase
      .from("schedule_tasks")
      .insert({
        project_id: data.project_id,
        parent_task_id: data.parent_task_id || null,
        name: data.name,
        start_date: data.start_date || null,
        finish_date: data.finish_date || null,
        duration_days: data.duration_days || null,
        percent_complete: data.percent_complete || 0,
        status: data.status || "not_started",
        is_milestone: data.is_milestone || false,
        constraint_type: data.constraint_type || null,
        constraint_date: data.constraint_date || null,
        wbs_code: data.wbs_code || null,
        sort_order: data.sort_order ?? sortOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return task as ScheduleTask;
  }

  /**
   * Update an existing task
   */
  async updateTask(
    projectId: string,
    taskId: string,
    data: ScheduleTaskUpdate
  ): Promise<ScheduleTask | null> {
    // Get current user
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    // Validate hierarchy constraints
    if (data.parent_task_id !== undefined) {
      await this.validateParentChange(taskId, data.parent_task_id);
    }

    // Validate milestone constraints
    if (data.is_milestone === true) {
      data.duration_days = 0;
      if (data.start_date) {
        data.finish_date = data.start_date;
      }
    }

    const updateData: Record<string, unknown> = {
      ...data,
    };

    const { data: task, error } = await this.supabase
      .from("schedule_tasks")
      .update(updateData)
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return task as ScheduleTask;
  }

  /**
   * Delete a task
   */
  async deleteTask(projectId: string, taskId: string): Promise<boolean> {
    // Delete will cascade to dependencies and deadlines
    const { error } = await this.supabase
      .from("schedule_tasks")
      .delete()
      .eq("id", taskId)
      .eq("project_id", projectId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }

    return true;
  }

  /**
   * Bulk update multiple tasks
   */
  async bulkUpdateTasks(
    projectId: string,
    bulkUpdate: ScheduleTaskBulkUpdate
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const success: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of bulkUpdate.ids) {
      try {
        const { error } = await this.supabase
          .from("schedule_tasks")
          .update({
            ...bulkUpdate.updates,
          })
          .eq("id", id)
          .eq("project_id", projectId);

        if (error) {
          failed.push({ id, error: error.message });
        } else {
          success.push(id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        failed.push({ id, error: message });
      }
    }

    return { success, failed };
  }

  // =============================================================================
  // DEPENDENCY OPERATIONS
  // =============================================================================

  /**
   * Get all dependencies for a project
   */
  async getDependencies(projectId: string): Promise<ScheduleDependency[]> {
    const { data, error } = await this.supabase
      .from("schedule_dependencies")
      .select(
        `
        *,
        predecessor:schedule_tasks!predecessor_task_id(project_id),
        task:schedule_tasks!task_id(project_id)
      `
      )
      .eq("predecessor.project_id", projectId);

    if (error) {
      throw new Error(`Failed to fetch dependencies: ${error.message}`);
    }

    return (data || []) as ScheduleDependency[];
  }

  /**
   * Create a new dependency
   */
  async createDependency(
    data: ScheduleDependencyCreate
  ): Promise<ScheduleDependency> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data: dependency, error } = await this.supabase
      .from("schedule_dependencies")
      .insert({
        task_id: data.task_id,
        predecessor_task_id: data.predecessor_task_id,
        dependency_type: data.dependency_type || "finish_to_start",
        lag_days: data.lag_days || 0,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("circular")) {
        throw new Error(
          "Cannot create dependency: would create a circular dependency chain"
        );
      }
      throw new Error(`Failed to create dependency: ${error.message}`);
    }

    return dependency as ScheduleDependency;
  }

  /**
   * Delete a dependency
   */
  async deleteDependency(dependencyId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("schedule_dependencies")
      .delete()
      .eq("id", dependencyId);

    if (error) {
      throw new Error(`Failed to delete dependency: ${error.message}`);
    }

    return true;
  }

  // =============================================================================
  // DEADLINE OPERATIONS
  // =============================================================================

  /**
   * Set or update a deadline for a task
   */
  async setDeadline(data: ScheduleDeadlineCreate): Promise<ScheduleDeadline> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) throw new Error("Authentication required");

    const { data: deadline, error } = await this.supabase
      .from("schedule_deadlines")
      .upsert(
        {
          task_id: data.task_id,
          deadline_date: data.deadline_date,
        },
        { onConflict: "task_id" }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set deadline: ${error.message}`);
    }

    return deadline as ScheduleDeadline;
  }

  /**
   * Remove a deadline from a task
   */
  async removeDeadline(taskId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from("schedule_deadlines")
      .delete()
      .eq("task_id", taskId);

    if (error) {
      throw new Error(`Failed to remove deadline: ${error.message}`);
    }

    return true;
  }

  // =============================================================================
  // HIERARCHY OPERATIONS
  // =============================================================================

  /**
   * Indent a task (make it a child of the previous sibling)
   */
  async indentTask(
    projectId: string,
    taskId: string
  ): Promise<ScheduleTask | null> {
    // Get the task and its siblings
    const task = await this.getTaskById(projectId, taskId);
    if (!task) throw new Error("Task not found");

    const { data: siblings } = await this.supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", projectId)
      .eq("parent_task_id", task.parent_task_id)
      .lt("sort_order", task.sort_order)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (!siblings || siblings.length === 0) {
      throw new Error("Cannot indent: no previous sibling to become parent");
    }

    const newParentId = siblings[0].id;
    return this.updateTask(projectId, taskId, { parent_task_id: newParentId });
  }

  /**
   * Outdent a task (move it up one level in hierarchy)
   */
  async outdentTask(
    projectId: string,
    taskId: string
  ): Promise<ScheduleTask | null> {
    const task = await this.getTaskById(projectId, taskId);
    if (!task) throw new Error("Task not found");

    if (!task.parent_task_id) {
      throw new Error("Cannot outdent: task is already at root level");
    }

    // Get the parent task to find the grandparent
    const parent = await this.getTaskById(projectId, task.parent_task_id);
    if (!parent) throw new Error("Parent task not found");

    return this.updateTask(projectId, taskId, {
      parent_task_id: parent.parent_task_id,
    });
  }

  // =============================================================================
  // SUMMARY & ANALYTICS
  // =============================================================================

  /**
   * Get schedule summary statistics
   */
  async getSummary(projectId: string): Promise<ScheduleSummary> {
    const { data: tasks, error } = await this.supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      throw new Error(`Failed to fetch summary: ${error.message}`);
    }

    if (!tasks || tasks.length === 0) {
      return {
        total_tasks: 0,
        completed_tasks: 0,
        in_progress_tasks: 0,
        not_started_tasks: 0,
        milestones_count: 0,
        overdue_tasks: 0,
        overall_percent_complete: 0,
      };
    }

    const total_tasks = tasks.length;
    const completed_tasks = tasks.filter((t) => t.status === "complete").length;
    const in_progress_tasks = tasks.filter(
      (t) => t.status === "in_progress"
    ).length;
    const not_started_tasks = tasks.filter(
      (t) => t.status === "not_started"
    ).length;
    const milestones_count = tasks.filter((t) => t.is_milestone).length;
    const today = new Date().toISOString().split("T")[0];
    const overdue_tasks = tasks.filter(
      (t) => t.status !== "complete" && t.finish_date && t.finish_date < today
    ).length;

    // Calculate weighted average percent complete
    const totalPercent = tasks.reduce(
      (sum, t) => sum + (t.percent_complete || 0),
      0
    );
    const overall_percent_complete = Math.round(totalPercent / total_tasks);

    return {
      total_tasks,
      completed_tasks,
      in_progress_tasks,
      not_started_tasks,
      milestones_count,
      overdue_tasks,
      overall_percent_complete,
    };
  }

  /**
   * Get data formatted for Gantt chart rendering
   */
  async getGanttData(projectId: string): Promise<GanttChartItem[]> {
    const { data: tasks, error: tasksError } = await this.supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    if (tasksError) {
      throw new Error(`Failed to fetch gantt data: ${tasksError.message}`);
    }

    if (!tasks) return [];

    const today = new Date().toISOString().split("T")[0];

    // Build hierarchy to get levels
    const hierarchy = this.buildHierarchy(tasks as ScheduleTask[]);
    const levelMap = new Map<string, number>();
    this.assignLevels(hierarchy, levelMap, 0);

    return tasks.map((task) => ({
      id: task.id,
      name: task.name,
      start_date: task.start_date || today,
      finish_date: task.finish_date || today,
      duration_days: task.duration_days || 0,
      percent_complete: task.percent_complete || 0,
      status: (task.status || "not_started") as "not_started" | "in_progress" | "complete",
      is_milestone: task.is_milestone || false,
      parent_task_id: task.parent_task_id,
      level: levelMap.get(task.id) || 0,
      dependencies: [],
      deadline: undefined,
      is_overdue: task.status !== "complete" && !!task.finish_date && task.finish_date < today,
    }));
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private mapSortField(sort: string): string {
    const mapping: Record<string, string> = {
      name: "name",
      start_date: "start_date",
      finish_date: "finish_date",
      percent_complete: "percent_complete",
      status: "status",
      created_at: "created_at",
      sort_order: "sort_order",
    };
    return mapping[sort] || "sort_order";
  }

  private async getNextSortOrder(
    projectId: string,
    parentTaskId: string | null
  ): Promise<number> {
    let query = this.supabase
      .from("schedule_tasks")
      .select("sort_order")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: false })
      .limit(1);

    if (parentTaskId === null) {
      query = query.is("parent_task_id", null);
    } else {
      query = query.eq("parent_task_id", parentTaskId);
    }

    const { data } = await query;

    if (data && data.length > 0) {
      return (data[0].sort_order || 0) + 1;
    }

    return 0;
  }

  private async validateParentChange(
    taskId: string,
    newParentId: string | null
  ): Promise<void> {
    if (!newParentId) return;

    // Check for circular reference
    if (newParentId === taskId) {
      throw new Error("Cannot set a task as its own parent");
    }

    // Check if the new parent is a descendant of this task
    const descendants = await this.getDescendants(taskId);
    if (descendants.includes(newParentId)) {
      throw new Error("Cannot set a descendant as the parent");
    }
  }

  private async getDescendants(taskId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from("schedule_tasks")
      .select("id")
      .eq("parent_task_id", taskId);

    if (!data || data.length === 0) return [];

    const descendants: string[] = data.map((d) => d.id);

    for (const child of data) {
      const childDescendants = await this.getDescendants(child.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  private buildHierarchy(tasks: ScheduleTask[]): ScheduleTaskWithHierarchy[] {
    const taskMap = new Map<string, ScheduleTaskWithHierarchy>();
    const roots: ScheduleTaskWithHierarchy[] = [];

    // First pass: create all nodes
    for (const task of tasks) {
      taskMap.set(task.id, {
        ...task,
        children: [],
        level: 0,
        expanded: true,
      });
    }

    // Second pass: build tree
    for (const task of tasks) {
      const node = taskMap.get(task.id)!;

      if (task.parent_task_id && taskMap.has(task.parent_task_id)) {
        const parent = taskMap.get(task.parent_task_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Third pass: assign levels
    this.assignLevels(roots, new Map(), 0);

    return roots;
  }

  private assignLevels(
    nodes: ScheduleTaskWithHierarchy[],
    levelMap: Map<string, number>,
    level: number
  ): void {
    for (const node of nodes) {
      node.level = level;
      levelMap.set(node.id, level);

      if (node.children.length > 0) {
        this.assignLevels(node.children, levelMap, level + 1);
      }
    }
  }
}
