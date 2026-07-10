/**
 * @jest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  buildDocumentTableColumns,
  type PipelineDoc,
} from "@/features/documents/documents-table-config";

function buildDocument(overrides: Partial<PipelineDoc> = {}): PipelineDoc {
  return {
    id: "doc-1",
    fireflies_id: null,
    title: "Owner contract",
    status: null,
    type: "document",
    category: "contract",
    document_type: "contract",
    source: "manual_upload",
    source_system: "manual_upload",
    source_web_url: null,
    date: "2026-07-02T12:00:00.000Z",
    created_at: "2026-07-02T12:00:00.000Z",
    captured_at: null,
    file_path: null,
    storage_bucket: null,
    url: null,
    project_id: 876,
    project_name: "Project 876",
    summary: null,
    overview: null,
    participants: null,
    participants_array: null,
    pipeline_stage: "done",
    attempt_count: 1,
    last_attempt_at: null,
    error_message: null,
    ...overrides,
  };
}

describe("documents table config", () => {
  it("renders the title as an in-place preview trigger when title selection is provided", () => {
    const handleTitleClick = jest.fn();
    const titleColumn = buildDocumentTableColumns({
      onTitleClick: handleTitleClick,
      getTitleHref: () => "/876/documents/doc-1",
    }).find((column) => column.id === "title");

    if (!titleColumn) {
      throw new Error("Title column missing");
    }

    render(<>{titleColumn.render(buildDocument())}</>);

    const trigger = screen.getByRole("button", { name: "Owner contract" });
    expect(screen.queryByRole("link", { name: "Owner contract" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(handleTitleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "doc-1" }),
    );
  });
});
