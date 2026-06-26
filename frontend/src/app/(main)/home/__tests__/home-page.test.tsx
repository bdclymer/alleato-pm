/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";

import type { CollaborationNotification } from "@/hooks/use-collaboration-notifications";
import { useCollaborationNotifications } from "@/hooks/use-collaboration-notifications";
import { apiFetch } from "@/lib/api-client";
import HomeActionDashboardPage from "../page";

jest.mock("@/components/layout", () => ({
  PageShell: ({
    children,
    title,
  }: {
    children: ReactNode;
    title: string;
  }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
  SectionRuleHeading: ({ label }: { label: string }) => <div>{label}</div>,
}));

jest.mock("@/hooks/use-collaboration-notifications", () => ({
  useCollaborationNotifications: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  apiFetch: jest.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;
const mockUseCollaborationNotifications =
  useCollaborationNotifications as jest.MockedFunction<
    typeof useCollaborationNotifications
  >;

function aiApprovalNotification(
  overrides: Partial<CollaborationNotification> = {},
): CollaborationNotification {
  return {
    id: "ai-decision-1",
    kind: "ai_notification_decision",
    title: "Change event draft",
    body: "Review generated change event.",
    createdAt: "2026-06-26T12:00:00.000Z",
    readAt: null,
    entityType: "change_events",
    entityId: "ce-1",
    projectId: 25125,
    metadata: {
      eventType: "ai_change_event_awaiting_approval",
      tier: "interrupt",
      channelsSelected: ["assistant_widget", "in_app"],
      requiredAction: "Review before commit.",
    },
    ...overrides,
  };
}

describe("HomeActionDashboardPage", () => {
  beforeEach(() => {
    mockUseCollaborationNotifications.mockReturnValue({
      notifications: [aiApprovalNotification()],
      unreadCount: 1,
      isLoading: false,
      isFetchingMore: false,
      error: null,
      hasMore: false,
      fetchMore: jest.fn(),
      markAsRead: jest.fn(),
      markReviewed: jest.fn(),
      markAllAsRead: jest.fn(),
      deleteNotification: jest.fn(),
      deleteAll: jest.fn(),
    });

    mockApiFetch.mockImplementation(async (url) => {
      const href = String(url);

      if (href.startsWith("/api/projects")) {
        return {
          data: [
            {
              id: 25125,
              name: "Goodwill",
              client: "Goodwill",
              phase: "Construction",
              state: "active",
              updated_at: "2026-06-25T12:00:00.000Z",
            },
          ],
          meta: { isAdmin: false },
        };
      }

      if (href.startsWith("/api/tasks")) {
        return {
          data: [
            {
              id: "task-1",
              title: "Review owner change",
              description: null,
              due_date: null,
              priority: "high",
              status: "open",
              project_id: null,
              project_name: "Goodwill",
              source_system: "manual",
              source_title: "Owner change",
              source_date: null,
              updated_at: "2026-06-25T12:00:00.000Z",
              created_at: "2026-06-25T12:00:00.000Z",
            },
          ],
        };
      }

      throw new Error(`Unexpected request: ${href}`);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("keeps AI approvals and profile accessible from the rendered review queue", async () => {
    render(<HomeActionDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Review queue")).toBeInTheDocument();
    });

    expect(
      screen.getAllByText(
        "1 AI decision waiting. 1 also alerts the AI widget.",
      ),
    ).toHaveLength(2);

    const aiApprovalLinks = screen.getAllByRole("link", {
      name: /AI approvals/i,
    });
    expect(aiApprovalLinks[0]).toHaveAttribute("href", "/ai/approvals");

    const aiProfileLink = screen.getByRole("link", { name: /AI profile/i });
    expect(aiProfileLink).toHaveAttribute("href", "/ai/profile");
    expect(
      screen.getByText(
        "Review what AI can use for role, memory, and approval context.",
      ),
    ).toBeInTheDocument();
  });
});
