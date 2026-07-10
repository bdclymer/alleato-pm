/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { ProgressReportEditor } from "../progress-report-editor";

const useProgressReportMock = jest.fn();
const useUpdateProgressReportMock = jest.fn();

jest.mock("@/hooks/use-progress-reports", () => ({
  useProgressReport: (...args: unknown[]) => useProgressReportMock(...args),
  useUpdateProgressReport: (...args: unknown[]) => useUpdateProgressReportMock(...args),
}));

jest.mock("@/hooks/useProjectTitle", () => ({
  useProjectTitle: jest.fn(),
}));

jest.mock("@/hooks/use-pdf-export", () => ({
  downloadPdf: jest.fn(),
}));

jest.mock("@/components/misc/markdown", () => ({
  Markdown: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("ProgressReportEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUpdateProgressReportMock.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  it("shows an actionable error state instead of a permanent skeleton when the detail query fails", () => {
    useProgressReportMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("Authentication required."),
      refetch: jest.fn(),
    });

    render(<ProgressReportEditor projectId={876} reportId="report-123" />);

    expect(screen.getByText("Could not load progress report")).toBeInTheDocument();
    expect(screen.getByText("Authentication required.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
