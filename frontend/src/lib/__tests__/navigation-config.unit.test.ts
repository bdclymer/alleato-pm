import { financialManagementTools, headerNavGroups } from "@/lib/navigation-config";

const headerTools = headerNavGroups.flatMap((group) => group.tools);

describe("navigation config", () => {
  it("keeps project status report available to header active-tool matching", () => {
    const financialTool = financialManagementTools.find(
      (tool) => tool.name === "Project Status Report"
    );
    const headerTool = headerTools.find((tool) => tool.name === "Project Status Report");

    expect(financialTool?.path).toBe("project-status-report");
    expect(headerTool).toMatchObject({
      name: "Project Status Report",
      path: "project-status-report",
      requiresProject: true,
    });
  });

  it("points the Schedule header tool at the schedule landing page", () => {
    const headerTool = headerTools.find((tool) => tool.name === "Schedule");

    expect(headerTool).toMatchObject({
      name: "Schedule",
      path: "schedule",
      requiresProject: true,
    });
  });
});
