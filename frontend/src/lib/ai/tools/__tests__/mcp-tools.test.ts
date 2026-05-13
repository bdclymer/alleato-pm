import type { ToolSet } from "ai";

import { mcpToolPolicyForTests } from "../mcp-tools";

const makeToolSet = (toolNames: string[]): ToolSet =>
  Object.fromEntries(
    toolNames.map((toolName) => [
      toolName,
      {
        description: `mock ${toolName}`,
        inputSchema: {},
      },
    ]),
  ) as ToolSet;

describe("AI assistant MCP tool policy", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("adds the official Excalidraw remote MCP server by default", () => {
    delete process.env.AI_ASSISTANT_MCP_SERVERS;
    delete process.env.SUPABASE_ACCESS_TOKEN;
    delete process.env.SUPABASE_MANAGEMENT_API_TOKEN;
    delete process.env.LINEAR_MCP_SERVER_URL;
    delete process.env.LINEAR_MCP_TOKEN;
    delete process.env.LINEAR_API_KEY;

    const servers = mcpToolPolicyForTests.getConfiguredMcpServers();

    expect(servers).toEqual([
      expect.objectContaining({
        name: "excalidraw",
        url: "https://mcp.excalidraw.com/mcp",
        allowedTools: mcpToolPolicyForTests.EXCALIDRAW_MCP_ALLOWED_TOOLS,
      }),
    ]);
  });

  it("allowlists Excalidraw diagram tools without weakening generic MCP mutation filtering", () => {
    const tools = makeToolSet([
      "read_me",
      "create_view",
      "export_to_excalidraw",
      "save_checkpoint",
      "read_checkpoint",
      "delete_everything",
    ]);

    const prefixedTools = mcpToolPolicyForTests.prefixMcpTools(
      {
        name: "excalidraw",
        url: "https://mcp.excalidraw.com/mcp",
        allowedTools: mcpToolPolicyForTests.EXCALIDRAW_MCP_ALLOWED_TOOLS,
      },
      tools,
    );

    expect(Object.keys(prefixedTools).sort()).toEqual(
      [
        "mcp_excalidraw_create_view",
        "mcp_excalidraw_export_to_excalidraw",
        "mcp_excalidraw_read_checkpoint",
        "mcp_excalidraw_read_me",
        "mcp_excalidraw_save_checkpoint",
      ].sort(),
    );
  });

  it("keeps generic MCP servers read-only by default", () => {
    expect(
      mcpToolPolicyForTests.shouldEnableMcpTool(
        { name: "generic", url: "https://example.com/mcp" },
        "create_view",
      ),
    ).toBe(false);
    expect(
      mcpToolPolicyForTests.shouldEnableMcpTool(
        { name: "generic", url: "https://example.com/mcp" },
        "read_checkpoint",
      ),
    ).toBe(true);
  });
});
