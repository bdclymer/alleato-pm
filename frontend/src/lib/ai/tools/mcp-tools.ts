import { createMCPClient, type MCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

type McpServerConfig = {
  name: string;
  url: string;
  authorization?: string;
  headers?: Record<string, string>;
  allowedTools?: string[];
};

type McpToolBundle = {
  tools: ToolSet;
  trace: Record<string, unknown>[];
  close: () => Promise<void>;
};

const MCP_CONNECT_TIMEOUT_MS = 8_000;
const EXCALIDRAW_MCP_SERVER_NAME = "excalidraw";
const EXCALIDRAW_MCP_SERVER_URL = "https://mcp.excalidraw.com/mcp";
const EXCALIDRAW_MCP_ALLOWED_TOOLS = [
  "read_me",
  "create_view",
  "export_to_excalidraw",
  "save_checkpoint",
  "read_checkpoint",
];

const READONLY_TOOL_PATTERNS = [
  /^get/i,
  /^list/i,
  /^read/i,
  /^search/i,
  /^query/i,
  /^retrieve/i,
  /^find/i,
  /^lookup/i,
];

const DANGEROUS_TOOL_PATTERNS = [
  /apply/i,
  /create/i,
  /delete/i,
  /drop/i,
  /execute[_-]?sql/i,
  /insert/i,
  /migration/i,
  /mutate/i,
  /remove/i,
  /run[_-]?sql/i,
  /truncate/i,
  /update/i,
  /upsert/i,
  /write/i,
];

function parseJsonServerConfig(): McpServerConfig[] {
  const raw = process.env.AI_ASSISTANT_MCP_SERVERS;
  if (!raw?.trim()) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("AI_ASSISTANT_MCP_SERVERS must be a JSON array.");
  }

  return parsed.map((server, index) => {
    if (!server || typeof server !== "object") {
      throw new Error(`AI_ASSISTANT_MCP_SERVERS[${index}] must be an object.`);
    }
    const value = server as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const url = typeof value.url === "string" ? value.url.trim() : "";
    if (!name || !url) {
      throw new Error(`AI_ASSISTANT_MCP_SERVERS[${index}] requires name and url.`);
    }

    const headers =
      value.headers && typeof value.headers === "object" && !Array.isArray(value.headers)
        ? Object.fromEntries(
            Object.entries(value.headers as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string",
            ),
          )
        : undefined;

    return {
      name,
      url,
      authorization:
        typeof value.authorization === "string" ? value.authorization : undefined,
      headers,
      allowedTools: Array.isArray(value.allowedTools)
        ? value.allowedTools.filter((toolName): toolName is string => typeof toolName === "string")
        : undefined,
    };
  });
}

function getConfiguredMcpServers(): McpServerConfig[] {
  const servers = parseJsonServerConfig();
  const configuredServerNames = new Set(servers.map((server) => server.name));

  if (
    process.env.AI_ASSISTANT_DISABLE_EXCALIDRAW_MCP !== "true" &&
    !configuredServerNames.has(EXCALIDRAW_MCP_SERVER_NAME)
  ) {
    servers.push({
      name: EXCALIDRAW_MCP_SERVER_NAME,
      url: EXCALIDRAW_MCP_SERVER_URL,
      allowedTools: EXCALIDRAW_MCP_ALLOWED_TOOLS,
    });
  }

  const supabaseToken =
    process.env.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_MANAGEMENT_API_TOKEN;

  if (process.env.AI_ASSISTANT_DISABLE_SUPABASE_MCP !== "true" && supabaseToken) {
    servers.push({
      name: "supabase",
      url: "https://mcp.supabase.com/mcp?project_ref=lgveqfnpkxvzbnnwuled",
      authorization: supabaseToken,
    });
  }

  const linearUrl = process.env.LINEAR_MCP_SERVER_URL;
  const linearToken = process.env.LINEAR_MCP_TOKEN ?? process.env.LINEAR_API_KEY;
  if (linearUrl && linearToken) {
    servers.push({
      name: "linear",
      url: linearUrl,
      authorization: linearToken,
    });
  }

  return servers;
}

function isReadOnlyMcpTool(toolName: string): boolean {
  if (DANGEROUS_TOOL_PATTERNS.some((pattern) => pattern.test(toolName))) {
    return false;
  }
  return READONLY_TOOL_PATTERNS.some((pattern) => pattern.test(toolName));
}

function shouldEnableMcpTool(server: McpServerConfig, toolName: string): boolean {
  if (server.allowedTools) {
    return server.allowedTools.includes(toolName);
  }

  return isReadOnlyMcpTool(toolName);
}

function prefixMcpTools(server: McpServerConfig, tools: ToolSet): ToolSet {
  return Object.fromEntries(
    Object.entries(tools)
      .filter(([toolName]) => shouldEnableMcpTool(server, toolName))
      .map(([toolName, tool]) => [`mcp_${server.name}_${toolName}`, tool]),
  ) as ToolSet;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function createAiAssistantMcpTools(): Promise<McpToolBundle> {
  const servers = getConfiguredMcpServers();
  const clients: MCPClient[] = [];
  const trace: Record<string, unknown>[] = [];
  const tools: ToolSet = {};

  for (const server of servers) {
    try {
      const headers = {
        ...server.headers,
        ...(server.authorization
          ? { Authorization: `Bearer ${server.authorization}` }
          : {}),
      };
      const client = await withTimeout(
        createMCPClient({
          name: `alleato-ai-assistant-${server.name}`,
          transport: {
            type: "http",
            url: server.url,
            headers,
            redirect: "error",
          },
        }),
        MCP_CONNECT_TIMEOUT_MS,
        `${server.name} MCP connection`,
      );
      clients.push(client);

      const discoveredTools = await withTimeout(
        client.tools(),
        MCP_CONNECT_TIMEOUT_MS,
        `${server.name} MCP tool discovery`,
      );
      const safeTools = prefixMcpTools(server, discoveredTools as ToolSet);
      Object.assign(tools, safeTools);

      trace.push({
        tool: "mcpToolDiscovery",
        input: {
          server: server.name,
          url: server.url,
        },
        output: {
          discoveredToolCount: Object.keys(discoveredTools).length,
          enabledToolCount: Object.keys(safeTools).length,
          enabledTools: Object.keys(safeTools),
          allowedTools: server.allowedTools,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      trace.push({
        tool: "mcpToolDiscovery",
        input: {
          server: server.name,
          url: server.url,
        },
        output: {
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    tools,
    trace,
    close: async () => {
      await Promise.allSettled(clients.map((client) => client.close()));
    },
  };
}

export const mcpToolPolicyForTests = {
  EXCALIDRAW_MCP_ALLOWED_TOOLS,
  getConfiguredMcpServers,
  prefixMcpTools,
  shouldEnableMcpTool,
};
