import {
  adminTools,
  buildToolUrl,
  companyWideHeaderTools,
  coreTools,
  developerCompanyAdminTools,
  filterToolsByPermission,
  financialManagementTools,
  headerNavGroups,
  projectManagementTools,
  subcontractorTools,
} from "@/lib/navigation-config";

const headerTools = headerNavGroups.flatMap((group) => group.tools);

describe("navigation config", () => {
  // Guardrail: the sidebar/header render each nav array with a React key of
  // `${tool.path}:${tool.name}`. Two entries sharing that key throw the
  // "Encountered two children with the same key" console error and may drop a
  // menu item. Fail loudly here instead of shipping a duplicate.
  it.each([
    ["coreTools", coreTools],
    ["projectManagementTools", projectManagementTools],
    ["financialManagementTools", financialManagementTools],
    ["subcontractorTools", subcontractorTools],
    ["adminTools", adminTools],
    ["companyWideHeaderTools", companyWideHeaderTools],
    ["developerCompanyAdminTools", developerCompanyAdminTools],
    ...headerNavGroups.map(
      (group) => [`headerNavGroups:${group.label}`, group.tools] as const
    ),
  ])("has no duplicate path:name keys in %s", (_label, tools) => {
    const keys = tools.map((tool) => `${tool.path}:${tool.name}`);
    expect(keys).toHaveLength(new Set(keys).size);
  });
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

  it("marks company admin navigation as developer-only", () => {
    expect(developerCompanyAdminTools.length).toBeGreaterThan(0);
    expect(
      developerCompanyAdminTools.every((tool) => tool.developerOnly === true && !tool.adminOnly)
    ).toBe(true);
  });

  it("hides company admin navigation from regular app admins", () => {
    const tools = filterToolsByPermission(
      developerCompanyAdminTools,
      25125,
      {},
      true,
      "admin",
      false,
    );

    expect(tools).toHaveLength(0);
  });

  it("shows company admin navigation to developers", () => {
    const tools = filterToolsByPermission(
      developerCompanyAdminTools,
      25125,
      {},
      false,
      "employee",
      true,
    );

    expect(tools.some((tool) => tool.name === "Admin Dashboard")).toBe(true);
    expect(tools.some((tool) => tool.name === "Project Intelligence")).toBe(true);
  });

  it("does not show project-scoped admin navigation without a project", () => {
    const tools = filterToolsByPermission(
      developerCompanyAdminTools,
      null,
      {},
      false,
      "employee",
      true,
    );

    expect(tools.some((tool) => tool.name === "Admin Dashboard")).toBe(true);
    expect(tools.some((tool) => tool.name === "Project Intelligence")).toBe(false);
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

  it("keeps the AI section available to non-developer users", () => {
    // Guardrail: the AI assistant is intentionally available to ALL authenticated
    // users. It must not be marked developerOnly (which would hide its nav link)
    // unless the page + /api/ai-assistant routes also enforce the role server-side.
    const aiTool = companyWideHeaderTools.find((tool) => tool.name === "AI");

    expect(aiTool).toMatchObject({ name: "AI", path: "ai" });
    expect(aiTool?.developerOnly).toBeUndefined();

    const tools = filterToolsByPermission(
      companyWideHeaderTools,
      null,
      {},
      false,
      "employee",
      false,
    );

    expect(tools.some((tool) => tool.name === "AI")).toBe(true);
    expect(tools.some((tool) => tool.name === "Skill Library")).toBe(true);
    expect(tools.some((tool) => tool.name === "Teach Alleato")).toBe(true);
    expect(tools.some((tool) => tool.name === "AI Learning Promotions")).toBe(false);
  });

  it("keeps company-wide Work tools enabled for non-developer users", () => {
    const expectedTools = [
      { name: "Meetings", path: "meetings", href: "/meetings" },
      { name: "Tasks", path: "tasks", href: "/tasks" },
      { name: "Knowledge Base", path: "knowledge", href: "/knowledge" },
    ];

    for (const expectedTool of expectedTools) {
      const tool = companyWideHeaderTools.find((candidate) => candidate.name === expectedTool.name);

      expect(tool).toMatchObject({
        name: expectedTool.name,
        path: expectedTool.path,
        requiresProject: false,
      });
      expect(tool?.developerOnly).toBeUndefined();
      expect(buildToolUrl(tool?.path ?? "", null, tool?.requiresProject)).toBe(expectedTool.href);
    }

    const tools = filterToolsByPermission(
      companyWideHeaderTools,
      null,
      {},
      false,
      "employee",
      false,
    );

    for (const expectedTool of expectedTools) {
      expect(tools.some((tool) => tool.name === expectedTool.name)).toBe(true);
    }
  });
});
