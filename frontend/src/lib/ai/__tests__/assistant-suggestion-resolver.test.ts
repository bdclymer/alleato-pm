import type { AssistantActionCatalogGroup } from "@/lib/ai/assistant-action-catalog";
import { resolveAssistantSuggestions } from "@/lib/ai/assistant-suggestion-resolver";

describe("assistant suggestion resolver", () => {
  it("returns route-aware suggestions before command-center defaults", () => {
    const suggestions = resolveAssistantSuggestions({
      pathname: "/25125/rfis",
      surface: "widget",
    });

    expect(suggestions).toHaveLength(4);
    expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
      "createRFI",
      "getProjectBriefingSnapshot",
      "searchEmails",
      "searchTeamsMessages",
    ]);
    expect(suggestions[0]).toMatchObject({
      label: "Draft an RFI",
      status: "preview_required",
      reason: "RFI route context",
    });
  });

  it("uses command center defaults when no route rule matches", () => {
    const suggestions = resolveAssistantSuggestions({
      pathname: "/ai",
      surface: "command_center",
    });

    expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
      "openAiApprovals",
      "getProjectBriefingSnapshot",
      "createRFI",
      "createChangeEvent",
    ]);
    expect(suggestions[0]).toMatchObject({
      label: "Review AI approvals",
      href: "/ai/approvals",
      status: "ready",
    });
  });

  it("uses persistent widget action chips when no route rule matches", () => {
    const suggestions = resolveAssistantSuggestions({
      pathname: "/comments",
      surface: "widget",
    });

    expect(suggestions.map((suggestion) => suggestion.label)).toEqual([
      "Review AI approvals",
      "Project status report",
      "Create change request",
      "Tasks overview",
    ]);
    expect(suggestions[0].href).toBe("/ai/approvals");
    expect(suggestions[1].prompt).toContain("selected project");
  });

  it("does not return more than the requested suggestion limit", () => {
    const suggestions = resolveAssistantSuggestions({
      pathname: "/25125/progress-reports",
      surface: "widget",
      maxSuggestions: 3,
    });

    expect(suggestions).toHaveLength(3);
  });

  it("fails loudly when a referenced catalog action is missing", () => {
    const catalogWithoutRfi: AssistantActionCatalogGroup[] = [
      {
        title: "Find evidence",
        description: "Evidence",
        items: [],
      },
    ];

    expect(() =>
      resolveAssistantSuggestions({
        pathname: "/25125/rfis",
        surface: "widget",
        catalog: catalogWithoutRfi,
      }),
    ).toThrow("AI suggestion resolver referenced unknown catalog action: createRFI");
  });
});
