export const dynamic = "force-dynamic";

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import SiteMapClient, { type InventoryRoute } from "./site-map-client";

type InventoryCsvRow = {
  route: string;
  kind: string;
  dynamic: string;
  refCount: string;
  file: string;
  refSample: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && inQuotes && nextChar === "\"") {
      value += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(value);
      value = "";
      continue;
    }

    value += char;
  }

  values.push(value);
  return values;
}

function parseRouteInventoryCsv(csv: string): InventoryCsvRow[] {
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/);
  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine);
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = parseCsvLine(line);
      return headers.reduce<Record<string, string>>((row, header, index) => {
        row[header] = values[index] ?? "";
        return row;
      }, {}) as InventoryCsvRow;
    })
    .filter((row) => row.route);
}

function toTitle(route: string): string {
  const segments = route.split("/").filter(Boolean);
  const lastConcreteSegment =
    [...segments].reverse().find((segment) => !segment.startsWith("[")) ?? "portfolio";

  return lastConcreteSegment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function inferCategory(route: string, file: string): InventoryRoute["category"] {
  const routeLower = route.toLowerCase();
  const fileLower = file.toLowerCase();

  if (routeLower.includes("ai") || routeLower.includes("rag") || routeLower.includes("intelligence")) {
    return "AI Intelligence";
  }
  if (routeLower.includes("admin") || fileLower.includes("/(admin)/")) {
    return "Admin";
  }
  if (routeLower.includes("budget") || routeLower.includes("invoice") || routeLower.includes("contract") || routeLower.includes("change-order") || routeLower.includes("commitment") || routeLower.includes("direct-cost") || routeLower.includes("accounting")) {
    return "Financials";
  }
  if (routeLower.includes("document") || routeLower.includes("drawing") || routeLower.includes("specification") || routeLower.includes("photo") || routeLower.includes("file")) {
    return "Documents";
  }
  if (routeLower.includes("directory") || routeLower.includes("team") || routeLower.includes("people") || routeLower.includes("vendor") || routeLower.includes("company") || routeLower.includes("contact")) {
    return "Team / Directory";
  }
  if (routeLower.includes("test") || routeLower.includes("qa") || routeLower.includes("errors")) {
    return "Testing / QA";
  }
  if (routeLower.includes("settings") || routeLower.includes("auth") || routeLower.includes("api-docs") || routeLower.includes("design") || routeLower.includes("table-pages")) {
    return "System";
  }
  return "Project Management";
}

function inferType(route: string, file: string): InventoryRoute["type"] {
  const routeLower = route.toLowerCase();
  const fileLower = file.toLowerCase();

  if (route.includes("[projectId]")) return "Project Page";
  if (fileLower.includes("/(admin)/") || routeLower.includes("/admin")) return "Admin Page";
  if (routeLower.includes("report") || routeLower.includes("wip") || routeLower.includes("insight")) return "Report";
  if (routeLower.includes("ai") || routeLower.includes("rag") || routeLower.includes("intelligence")) return "AI / Intelligence";
  if (routeLower.includes("settings") || routeLower.includes("auth")) return "Settings";
  if (fileLower.includes("/(tables)/") || routeLower.includes("table")) return "Database / Table";
  if (routeLower.includes("/new") || routeLower.includes("/edit") || routeLower.includes("/create") || routeLower.includes("workflow")) return "Workflow";
  return "Utility";
}

function readRouteInventory(): InventoryRoute[] {
  const candidates = [
    join(process.cwd(), "docs", "reports", "route-inventory.csv"),
    join(process.cwd(), "..", "docs", "reports", "route-inventory.csv"),
  ];
  const inventoryPath = candidates.find((candidate) => existsSync(candidate));

  if (!inventoryPath) return [];

  const csv = readFileSync(inventoryPath, "utf8");
  return parseRouteInventoryCsv(csv).map((row) => ({
    route: row.route,
    page: toTitle(row.route),
    category: inferCategory(row.route, row.file),
    type: inferType(row.route, row.file),
    status: "Needs Review",
    notes: "",
    lastReviewed: "",
    dynamic: row.dynamic === "true",
    kind: row.kind,
    refCount: Number(row.refCount) || 0,
    file: row.file,
    refSample: row.refSample,
  }));
}

export default function SiteMapPage() {
  return <SiteMapClient routes={readRouteInventory()} />;
}
