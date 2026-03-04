/**
 * =============================================================================
 * SCHEDULING MODULE TYPES
 * =============================================================================
 *
 * TypeScript interfaces for the scheduling module
 * Based on Procore crawl data and schema.sql specifications
 */

// Task status enum
export type TaskStatus = "not_started" | "in_progress" | "complete";

// Constraint types for task scheduling
export type ConstraintType =
  | "none"
  | "start_no_earlier_than"
  | "finish_no_later_than"
  | "must_start_on"
  | "must_finish_on";

// Dependency types
export type DependencyType = "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish";

/**
 * Main Schedule Task interface
 * Represents a single task in the project schedule
 */
export interface ScheduleTask {
  id: string;
  project_id: number;
  parent_task_id: string | null;
  name: string;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  percent_complete: number;
  status: TaskStatus;
  is_milestone: boolean;
  constraint_type: ConstraintType | null;
  constraint_date: string | null;
  wbs_code: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Derived/joined fields
  children?: ScheduleTask[];
  dependencies?: ScheduleDependency[];
  deadline?: ScheduleDeadline;
}

/**
 * Task dependency relationship
 * Defines predecessor/successor relationships between tasks
 */
export interface ScheduleDependency {
  id: string;
  task_id: string;
  predecessor_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;
}

/**
 * Task deadline
 * Marks a specific date that a task should not exceed
 */
export interface ScheduleDeadline {
  id: string;
  task_id: string;
  deadline_date: string;
  created_at: string;
}

/**
 * Task creation payload
 * Used when creating a new task
 */
export interface ScheduleTaskCreate {
  name: string;
  project_id: number;
  parent_task_id?: string | null;
  start_date?: string | null;
  finish_date?: string | null;
  duration_days?: number | null;
  percent_complete?: number;
  status?: TaskStatus;
  is_milestone?: boolean;
  constraint_type?: ConstraintType | null;
  constraint_date?: string | null;
  wbs_code?: string | null;
  sort_order?: number;
}

/**
 * Task update payload
 * Used for partial updates to existing tasks
 */
export interface ScheduleTaskUpdate {
  name?: string;
  parent_task_id?: string | null;
  start_date?: string | null;
  finish_date?: string | null;
  duration_days?: number | null;
  percent_complete?: number;
  status?: TaskStatus;
  is_milestone?: boolean;
  constraint_type?: ConstraintType | null;
  constraint_date?: string | null;
  wbs_code?: string | null;
  sort_order?: number;
}

/**
 * Bulk update payload
 * Used for updating multiple tasks at once
 */
export interface ScheduleTaskBulkUpdate {
  ids: string[];
  updates: ScheduleTaskUpdate;
}

/**
 * Dependency creation payload
 */
export interface ScheduleDependencyCreate {
  task_id: string;
  predecessor_task_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}

/**
 * Deadline creation payload
 */
export interface ScheduleDeadlineCreate {
  task_id: string;
  deadline_date: string;
}

/**
 * Task list query parameters
 */
export interface ScheduleTaskListParams {
  page?: number;
  limit?: number;
  sort?: "name" | "start_date" | "finish_date" | "percent_complete" | "status" | "created_at" | "sort_order";
  order?: "asc" | "desc";
  status?: TaskStatus | "all";
  parent_task_id?: string | null;
  is_milestone?: boolean;
  search?: string;
}

/**
 * Paginated response wrapper for scheduling module
 * Note: This is distinct from the general PaginatedResponse in @/app/api/types
 * which uses different field names (meta instead of pagination, page instead of current_page, etc.)
 */
export interface SchedulePaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

/**
 * Schedule summary statistics
 */
export interface ScheduleSummary {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  milestones_count: number;
  overdue_tasks: number;
  overall_percent_complete: number;
}

/**
 * Task with full hierarchy loaded
 * Used for tree view rendering
 */
export interface ScheduleTaskWithHierarchy extends ScheduleTask {
  children: ScheduleTaskWithHierarchy[];
  level: number;
  expanded?: boolean;
}

/**
 * Gantt chart data item
 * Flattened task data for Gantt rendering
 */
export interface GanttChartItem {
  id: string;
  name: string;
  start_date: string;
  finish_date: string;
  duration_days: number;
  percent_complete: number;
  status: TaskStatus;
  is_milestone: boolean;
  parent_task_id: string | null;
  level: number;
  dependencies: Array<{
    predecessor_id: string;
    type: DependencyType;
    lag_days: number;
  }>;
  deadline?: string;
  is_overdue: boolean;
  is_critical_path?: boolean;
}

/**
 * Context menu action
 * Represents available actions in the task context menu
 */
export type ScheduleContextAction =
  | "add_task"
  | "edit_task"
  | "delete_task"
  | "copy_task"
  | "cut_task"
  | "paste_task"
  | "indent_task"
  | "outdent_task"
  | "convert_to_milestone"
  | "set_deadline"
  | "scroll_to_task"
  | "bulk_edit_tasks"
  | "import_schedule"
  | "export_schedule";
