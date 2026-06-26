type HomeQueueTask = {
  project_id: number | null;
};

export type HomePrimaryQueueAction = {
  href: string;
  label: string;
};

export function getHomePrimaryQueueAction({
  todayTasks,
  openTasks,
  aiApprovalCount,
}: {
  todayTasks: HomeQueueTask[];
  openTasks: HomeQueueTask[];
  aiApprovalCount: number;
}): HomePrimaryQueueAction {
  if (todayTasks[0]?.project_id) {
    return {
      href: `/${todayTasks[0].project_id}/tasks`,
      label: "Open tasks",
    };
  }

  if (openTasks[0]?.project_id) {
    return {
      href: `/${openTasks[0].project_id}/tasks`,
      label: "Open tasks",
    };
  }

  if (aiApprovalCount > 0) {
    return {
      href: "/ai/approvals",
      label: "Review AI",
    };
  }

  return {
    href: "/tasks",
    label: "Open tasks",
  };
}
