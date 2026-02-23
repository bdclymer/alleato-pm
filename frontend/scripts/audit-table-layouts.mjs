#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");

const PAGE_SUFFIX = `${path.sep}page.tsx`;
const TABLE_PATH_HINTS = [
  `${path.sep}(main)${path.sep}[projectId]${path.sep}`,
  `${path.sep}(tables)${path.sep}`,
];

const NON_TABLE_ROUTE_SEGMENTS = new Set([
  "api",
  "layout.tsx",
  "loading.tsx",
  "error.tsx",
  "not-found.tsx",
  "new",
  "edit",
  "settings",
  "configure",
  "viewer",
  "recycle-bin",
]);

function normalizeRoute(pageFilePath) {
  const relative = path.relative(path.join(ROOT, "src", "app"), pageFilePath);
  const noPage = relative.slice(0, -`${path.sep}page.tsx`.length);
  const route = `/${noPage
    .replaceAll(path.sep, "/")
    .replace(/\([^)]*\)\//g, "")
    .replace(/\[projectId\]/g, ":projectId")}`;
  return route;
}

function isCandidateTablePage(pageFilePath) {
  if (!TABLE_PATH_HINTS.some((hint) => pageFilePath.includes(hint))) {
    return false;
  }
  const route = normalizeRoute(pageFilePath);
  const segments = route.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  const leaf = segments[segments.length - 1];
  if (leaf.startsWith(":")) return false;
  if (NON_TABLE_ROUTE_SEGMENTS.has(leaf)) return false;
  return true;
}

async function walk(dir, results = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, results);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(PAGE_SUFFIX)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function findRouteFiles(routeDir) {
  const files = [];
  async function walkRoute(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkRoute(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  await walkRoute(routeDir);
  return files;
}

function analyzeContent(content) {
  return {
    unifiedTable:
      content.includes('from "@/components/tables/unified"') ||
      content.includes("UnifiedTablePage"),
    genericTable: content.includes('from "@/components/tables/generic-table-factory"'),
    dataTable:
      content.includes('from "@/components/tables/DataTable"') ||
      content.includes("from '@/components/tables/DataTable'") ||
      content.includes("<DataTable "),
    rawTable:
      content.includes('from "@/components/ui/table"') ||
      content.includes(" <Table") ||
      content.includes("<Table "),
    pageHeader:
      content.includes("PageHeader") || content.includes("ProjectPageHeader"),
    pageContainer:
      content.includes("PageContainer") || content.includes("TableLayout"),
  };
}

function toStatus(flags) {
  if (flags.unifiedTable) return "OK";
  if (flags.genericTable || flags.dataTable || flags.rawTable) return "NON_STANDARD";
  return "UNKNOWN";
}

function parseRouteFilters(args) {
  const routeArg = args.find((arg) => arg.startsWith("--routes="));
  if (!routeArg) return [];
  return routeArg
    .replace("--routes=", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function routeMatchesFilters(route, routeFilters) {
  if (routeFilters.length === 0) return true;
  return routeFilters.some((filter) => route.includes(filter));
}

async function main() {
  const routeFilters = parseRouteFilters(process.argv.slice(2));
  const pageFiles = await walk(APP_DIR);
  const candidatePages = pageFiles.filter(isCandidateTablePage);

  const report = [];
  for (const pageFile of candidatePages) {
    const route = normalizeRoute(pageFile);
    if (!routeMatchesFilters(route, routeFilters)) {
      continue;
    }

    const routeDir = path.dirname(pageFile);
    const files = await findRouteFiles(routeDir);
    const combined = {
      unifiedTable: false,
      genericTable: false,
      dataTable: false,
      rawTable: false,
      pageHeader: false,
      pageContainer: false,
    };

    for (const file of files) {
      const content = await fs.readFile(file, "utf8");
      const flags = analyzeContent(content);
      combined.unifiedTable = combined.unifiedTable || flags.unifiedTable;
      combined.genericTable = combined.genericTable || flags.genericTable;
      combined.dataTable = combined.dataTable || flags.dataTable;
      combined.rawTable = combined.rawTable || flags.rawTable;
      combined.pageHeader = combined.pageHeader || flags.pageHeader;
      combined.pageContainer = combined.pageContainer || flags.pageContainer;
    }

    report.push({
      route,
      pageFile: path.relative(ROOT, pageFile),
      status: toStatus(combined),
      ...combined,
    });
  }

  report.sort((a, b) => a.route.localeCompare(b.route));

  const totals = report.reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { OK: 0, NON_STANDARD: 0, UNKNOWN: 0 },
  );

  console.log("Table Layout Audit");
  console.log(`Routes scanned: ${report.length}`);
  console.log(
    `OK: ${totals.OK} | NON_STANDARD: ${totals.NON_STANDARD} | UNKNOWN: ${totals.UNKNOWN}`,
  );
  console.log("");
  console.log(
    "status\troute\tunified\tgeneric\tdataTable\trawTable\theader\tcontainer\tpageFile",
  );
  for (const row of report) {
    console.log(
      [
        row.status,
        row.route,
        row.unifiedTable ? "Y" : "N",
        row.genericTable ? "Y" : "N",
        row.dataTable ? "Y" : "N",
        row.rawTable ? "Y" : "N",
        row.pageHeader ? "Y" : "N",
        row.pageContainer ? "Y" : "N",
        row.pageFile,
      ].join("\t"),
    );
  }

  if (totals.NON_STANDARD > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
