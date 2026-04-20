import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface ToolPrpStatus {
  tool: string;
  label: string;
  apiRoutes: number;
  hasPrp: boolean;
  hasAudit: boolean;
  hasTasks: boolean;
  tasksComplete: boolean | null; // null = no TASKS.md
  hasTestScenarios: boolean;
  hasValidationReport: boolean;
  validationPassed: boolean | null; // null = no report
  prpDir: string | null;
}

// All known tools in the app
const TOOLS: { slug: string; label: string; apiPath?: string }[] = [
  { slug: "budget", label: "Budget", apiPath: "budget" },
  { slug: "change-events", label: "Change Events", apiPath: "change-events" },
  { slug: "change-management", label: "Change Management", apiPath: "change-management" },
  { slug: "commitments", label: "Commitments", apiPath: "commitments" },
  { slug: "direct-costs", label: "Direct Costs", apiPath: "direct-costs" },
  { slug: "drawings", label: "Drawings", apiPath: "drawings" },
  { slug: "estimates", label: "Estimates", apiPath: "estimates" },
  { slug: "invoicing", label: "Invoicing", apiPath: "invoicing" },
  { slug: "prime-contracts", label: "Prime Contracts", apiPath: "contracts" },
  { slug: "rfis", label: "RFIs", apiPath: "rfis" },
  { slug: "submittals", label: "Submittals", apiPath: "submittals" },
  { slug: "rag", label: "RAG / AI" },
  { slug: "integrations", label: "Integrations" },
];

function countRoutes(apiPath: string): number {
  const base = path.join(
    process.cwd(),
    "..",
    "frontend",
    "src",
    "app",
    "api",
    "projects",
    "[projectId]",
    apiPath
  );
  // Also check the /contracts path for prime-contracts
  const alt = path.join(
    process.cwd(),
    "..",
    "frontend",
    "src",
    "app",
    "api",
    "projects",
    "[projectId]",
    "contracts"
  );

  function countInDir(dir: string): number {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name === "route.ts") count++;
      if (e.isDirectory()) count += countInDir(path.join(dir, e.name));
    }
    return count;
  }

  return countInDir(base);
}

function checkTasksComplete(tasksPath: string): boolean | null {
  if (!fs.existsSync(tasksPath)) return null;
  const content = fs.readFileSync(tasksPath, "utf-8");
  const unchecked = (content.match(/^- \[ \]/gm) || []).length;
  return unchecked === 0;
}

function checkValidationPassed(reportPath: string): boolean | null {
  if (!fs.existsSync(reportPath)) return null;
  const content = fs.readFileSync(reportPath, "utf-8");
  return content.includes("PASS");
}

export async function GET() {
  const prpBase = path.join(process.cwd(), "..", "docs", "PRPs");

  const results: ToolPrpStatus[] = TOOLS.map(({ slug, label, apiPath }) => {
    const prpDir = path.join(prpBase, slug);
    const dirExists = fs.existsSync(prpDir);

    // Detect PRP doc (prp-*.md or any *-PRP.md or PRP-*.md)
    let hasPrp = false;
    if (dirExists) {
      const files = fs.readdirSync(prpDir);
      hasPrp = files.some(
        (f) =>
          (f.startsWith("prp-") || f.toLowerCase().includes("prp")) &&
          f.endsWith(".md") &&
          !f.includes("VALIDATION") &&
          !f.includes("TASKS") &&
          !f.includes("AUDIT") &&
          !f.includes("TEST-SCENARIOS")
      );
    }

    const auditPath = path.join(prpDir, "AUDIT.md");
    const tasksPath = path.join(prpDir, "TASKS.md");
    const scenariosPath = path.join(prpDir, "TEST-SCENARIOS.md");
    const reportPath = path.join(prpDir, "VALIDATION-REPORT.md");

    const apiRoutes = apiPath ? countRoutes(apiPath) : 0;

    return {
      tool: slug,
      label,
      apiRoutes,
      hasPrp,
      hasAudit: dirExists && fs.existsSync(auditPath),
      hasTasks: dirExists && fs.existsSync(tasksPath),
      tasksComplete: dirExists ? checkTasksComplete(tasksPath) : null,
      hasTestScenarios: dirExists && fs.existsSync(scenariosPath),
      hasValidationReport: dirExists && fs.existsSync(reportPath),
      validationPassed: dirExists ? checkValidationPassed(reportPath) : null,
      prpDir: dirExists ? slug : null,
    };
  });

  return NextResponse.json(results);
}
