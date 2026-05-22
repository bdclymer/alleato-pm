import {
  filterToolsByPermission,
  financialManagementTools,
  headerNavGroups,
  projectManagementTools,
} from "@/lib/navigation-config";

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
      developerOnly: true,
    });
  });

  it("marks report surfaces as developer-only", () => {
    const progressReportsTool = projectManagementTools.find(
      (tool) => tool.name === "Progress Reports"
    );
    const projectStatusReportTool = financialManagementTools.find(
      (tool) => tool.name === "Project Status Report"
    );

    expect(progressReportsTool?.developerOnly).toBe(true);
    expect(projectStatusReportTool?.developerOnly).toBe(true);
  });

  it("hides developer-only report tools from non-developers", () => {
    const tools = filterToolsByPermission(
      [...projectManagementTools, ...financialManagementTools],
      25125,
      {
        documents: ["read"],
        budget: ["read"],
        contracts: ["read"],
        change_orders: ["read"],
      },
      false,
      "employee",
      false,
    );

    expect(tools.some((tool) => tool.name === "Progress Reports")).toBe(false);
    expect(tools.some((tool) => tool.name === "Project Status Report")).toBe(false);
  });

  it("shows developer-only report tools to developers with module access", () => {
    const tools = filterToolsByPermission(
      [...projectManagementTools, ...financialManagementTools],
      25125,
      {
        documents: ["read"],
        budget: ["read"],
        contracts: ["read"],
        change_orders: ["read"],
      },
      true,
      "employee",
      true,
    );

    expect(tools.some((tool) => tool.name === "Progress Reports")).toBe(true);
    expect(tools.some((tool) => tool.name === "Project Status Report")).toBe(true);
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
