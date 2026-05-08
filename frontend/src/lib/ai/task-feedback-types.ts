export const TASK_FEEDBACK_REASON_CATEGORIES = [
  "too_vague",
  "wrong_assignee",
  "wrong_due_date",
  "wrong_priority",
  "duplicate",
  "not_actionable",
  "missing_context",
  "other",
] as const;

export type TaskFeedbackReasonCategory =
  (typeof TASK_FEEDBACK_REASON_CATEGORIES)[number];

export const TASK_FEEDBACK_REASON_LABELS: Record<
  TaskFeedbackReasonCategory,
  string
> = {
  too_vague: "Too vague",
  wrong_assignee: "Wrong assignee",
  wrong_due_date: "Wrong due date",
  wrong_priority: "Wrong priority",
  duplicate: "Duplicate",
  not_actionable: "Not actionable",
  missing_context: "Missing context",
  other: "Other",
};

export type TaskFeedbackReasonSummaryCategory =
  | TaskFeedbackReasonCategory
  | "uncategorized";

export interface TaskFeedbackReasonSummary {
  category: TaskFeedbackReasonSummaryCategory;
  label: string;
  count: number;
  percentage: number;
}

function isTaskFeedbackReasonCategory(
  category: string | null | undefined,
): category is TaskFeedbackReasonCategory {
  return TASK_FEEDBACK_REASON_CATEGORIES.includes(
    category as TaskFeedbackReasonCategory,
  );
}

export function getTaskFeedbackReasonLabel(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  if (isTaskFeedbackReasonCategory(category)) {
    return TASK_FEEDBACK_REASON_LABELS[category];
  }
  return category;
}

export function summarizeTaskFeedbackReasonCategories(
  categories: Array<string | null | undefined>,
): TaskFeedbackReasonSummary[] {
  const total = categories.length;
  if (total === 0) return [];

  const counts: Record<TaskFeedbackReasonSummaryCategory, number> = {
    too_vague: 0,
    wrong_assignee: 0,
    wrong_due_date: 0,
    wrong_priority: 0,
    duplicate: 0,
    not_actionable: 0,
    missing_context: 0,
    other: 0,
    uncategorized: 0,
  };

  for (const category of categories) {
    if (isTaskFeedbackReasonCategory(category)) {
      counts[category] += 1;
    } else {
      counts.uncategorized += 1;
    }
  }

  return [
    ...TASK_FEEDBACK_REASON_CATEGORIES.map((category) => ({
      category,
      label: TASK_FEEDBACK_REASON_LABELS[category],
      count: counts[category],
      percentage: Math.round((counts[category] / total) * 100),
    })),
    {
      category: "uncategorized" as const,
      label: "Uncategorized",
      count: counts.uncategorized,
      percentage: Math.round((counts.uncategorized / total) * 100),
    },
  ]
    .filter((summary) => summary.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export interface TaskSnapshot {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
  projectId?: number | null;
  source?: string | null;
  generatedBy?: string | null;
}

export interface FewShotTask {
  name: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority: string;
  notes?: string | null;
}
