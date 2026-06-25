/** @jest-environment jsdom */

import { render, screen } from "@testing-library/react";

import { KnowledgeBasePage } from "../knowledge-base-page";

jest.mock("@/components/layout", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/hooks/use-knowledge-documents", () => ({
  useKnowledgeDocuments: () => ({
    isLoading: false,
    data: [
      {
        id: "doc-1",
        title: "Safety orientation",
        category: "knowledge",
        source: "knowledge_upload",
        status: "processed",
        tags: "Field Operations,safety",
        date: "2026-06-20T12:00:00Z",
        file_name: "safety-orientation.pdf",
        file_path: "knowledge/doc-1/safety-orientation.pdf",
        project_id: null,
        created_at: "2026-06-20T12:00:00Z",
      },
      {
        id: "doc-2",
        title: "Subcontract template",
        category: "knowledge",
        source: "sharepoint",
        status: "processed",
        tags: "Contracts,templates",
        date: "2026-06-19T12:00:00Z",
        file_name: "subcontract-template.docx",
        file_path: "knowledge/doc-2/subcontract-template.docx",
        project_id: null,
        created_at: "2026-06-19T12:00:00Z",
      },
    ],
  }),
}));

jest.mock("@/hooks/use-current-user-profile", () => ({
  useCurrentUserProfile: () => ({
    profile: { isAdmin: true },
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("KnowledgeBasePage", () => {
  it("renders a docs-style knowledge layout with topic nav and on-page index", () => {
    render(<KnowledgeBasePage />);

    expect(
      screen.getByRole("heading", { name: "Alleato Knowledge Base" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Knowledge topics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "On this page" }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search knowledge...")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Field Operations/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Contracts/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Safety orientation/ })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Manage sources" })[0]).toHaveAttribute(
      "href",
      "/knowledge/manage",
    );
  });
});
