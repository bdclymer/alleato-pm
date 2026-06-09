/** @jest-environment jsdom */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { TaskListItem } from "../tasks-inbox";
import type { TasksRow } from "../task-utils";

jest.mock("@/components/ai/TaskFeedbackButtons", () => ({
  TaskFeedbackButtons: ({ taskId }: { taskId?: string | null }) => (
    <div data-testid="task-feedback-buttons">{taskId}</div>
  ),
}));

jest.mock("@/components/ds/SwipeableListRow", () => ({
  SwipeableListRow: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function buildTask(overrides: Partial<TasksRow> = {}): TasksRow {
  return {
    id: "task-1",
    metadata_id: null,
    segment_id: null,
    source_chunk_id: null,
    schedule_task_id: null,
    description: "Follow up on revised permit comments",
    assignee_person_id: null,
    assignee_name: "Sam Lee",
    assignee_email: "sam@example.com",
    meeting_title: null,
    project_id: 42,
    project_name: "North Yard",
    client_id: null,
    due_date: null,
    priority: "high",
    status: "open",
    source_system: "email",
    embedding: null,
    created_at: "2026-06-08T10:00:00Z",
    updated_at: "2026-06-08T10:00:00Z",
    project_ids: [42],
    file_name: null,
    source_title: null,
    source_type: null,
    source_date: "2026-06-07T10:00:00Z",
    source_url: null,
    source_web_url: null,
    fireflies_link: null,
    meeting_link: null,
    source_context: "Sam needs to follow up on revised permit comments.",
    title: "Follow up on permit comments",
    assigned_by: "Brandon",
    extraction_source: "email",
    extraction_model: "gpt-5.5",
    extraction_prompt_version: "task_extraction.v5.gpt-5.5",
    extraction_metadata: null,
    ...overrides,
  };
}

describe("TaskListItem feedback visibility", () => {
  it("shows compact feedback controls only for AI-generated tasks in split-view rows", () => {
    const { rerender } = render(
      <TaskListItem
        item={buildTask()}
        projects={[]}
        isSelected={false}
        isChecked={false}
        onClick={() => {}}
        onCheckedChange={() => {}}
      />,
    );

    expect(screen.getByTestId("task-feedback-buttons")).toHaveTextContent("task-1");

    rerender(
      <TaskListItem
        item={buildTask({
          extraction_source: null,
          extraction_model: null,
          extraction_prompt_version: null,
        })}
        projects={[]}
        isSelected={false}
        isChecked={false}
        onClick={() => {}}
        onCheckedChange={() => {}}
      />,
    );

    expect(screen.queryByTestId("task-feedback-buttons")).not.toBeInTheDocument();
  });
});
