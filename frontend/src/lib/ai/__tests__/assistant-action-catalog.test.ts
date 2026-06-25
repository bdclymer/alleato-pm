import {
  ASSISTANT_ACTION_CATALOG,
  buildAssistantActionCatalog,
} from "@/lib/ai/assistant-action-catalog";
import { GLOBAL_ASSISTANT_TOOL_REGISTRY } from "@/lib/ai/tool-registry";

function catalogItems() {
  return ASSISTANT_ACTION_CATALOG.flatMap((group) => group.items);
}

describe("assistant action catalog", () => {
  it("derives high-value actions from the assistant tool registry", () => {
    const items = catalogItems();

    expect(items.find((item) => item.toolName === "createRFI")).toMatchObject({
      label: "Draft an RFI",
      status: "preview_required",
      requiresApproval: true,
    });
    expect(
      items.find((item) => item.toolName === "getProjectBriefingSnapshot"),
    ).toMatchObject({
      label: "Find project status evidence",
      status: "ready",
      requiresApproval: false,
    });
  });

  it("keeps delivery actions preview-first", () => {
    const teamsAction = catalogItems().find(
      (item) => item.toolName === "sendTeamsMessage",
    );

    expect(teamsAction).toMatchObject({
      status: "preview_required",
      requiresApproval: true,
    });
  });

  it("fails loudly when catalog metadata references a missing registry tool", () => {
    const registryWithoutRfi = GLOBAL_ASSISTANT_TOOL_REGISTRY.filter(
      (entry) => entry.name !== "createRFI",
    );

    expect(() =>
      buildAssistantActionCatalog({ registry: registryWithoutRfi }),
    ).toThrow("AI action catalog metadata missing registry entry: createRFI");
  });
});
