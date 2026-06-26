import { getHomePrimaryQueueAction } from "../home-action-routing";

describe("getHomePrimaryQueueAction", () => {
  it("routes to due project tasks before AI approvals", () => {
    expect(
      getHomePrimaryQueueAction({
        todayTasks: [{ project_id: 25125 }],
        openTasks: [{ project_id: 43 }],
        aiApprovalCount: 2,
      }),
    ).toEqual({
      href: "/25125/tasks",
      label: "Open tasks",
    });
  });

  it("routes to AI approvals when no project task queue is waiting", () => {
    expect(
      getHomePrimaryQueueAction({
        todayTasks: [],
        openTasks: [],
        aiApprovalCount: 3,
      }),
    ).toEqual({
      href: "/ai/approvals",
      label: "Review AI",
    });
  });

  it("falls back to the task inbox when there is no task project or AI review", () => {
    expect(
      getHomePrimaryQueueAction({
        todayTasks: [],
        openTasks: [{ project_id: null }],
        aiApprovalCount: 0,
      }),
    ).toEqual({
      href: "/tasks",
      label: "Open tasks",
    });
  });
});
