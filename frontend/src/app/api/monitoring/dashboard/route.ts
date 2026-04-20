import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
// Types for monitoring data
interface Initiative {
  id: string;
  name: string;
  owner: string;
  status: "planning" | "in-progress" | "verification" | "completed" | "blocked";
  priority: "high" | "medium" | "low";
  deadline?: string;
  progress: number;
  verification: "pending" | "verified" | "failed";
  lastUpdate: string;
  description?: string;
  tasks: Task[];
  blockers?: string[];
  questions?: string[];
}
interface Task {
  id: string;
  content: string;
  status: "pending" | "in-progress" | "completed";
  priority: "high" | "medium" | "low";
  assignee?: string;
  verification?: "pending" | "verified" | "failed";
}
interface SystemHealth {
  monitoring: "operational" | "degraded" | "down";
  verification: "operational" | "degraded" | "down";
  coordination: "operational" | "degraded" | "down";
  notifications: "operational" | "degraded" | "down";
}
interface ActivityLogEntry {
  timestamp: string;
  agent: string;
  action: string;
  details?: string;
  type: "info" | "success" | "warning" | "error";
}
interface AIInsight {
  type: "bottleneck" | "optimization" | "risk" | "opportunity";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  suggestion?: string;
  timestamp: string;
} /** * Parse PROJECT_MONITORING.md file to extract monitoring data */
async function parseMonitoringData(): Promise<{
  initiatives: Initiative[];
  systemHealth: SystemHealth;
  activityLog: ActivityLogEntry[];
  aiInsights: AIInsight[];
}> {
  try {
    const projectRoot = process.cwd().replace("/frontend", "");
    const monitoringPath = path.join(
      projectRoot,
      "documentation/1-project-mgmt/PROJECT_MONITORING.md",
    );
    const content = await fs.readFile(monitoringPath, "utf-8");
    const initiatives = parseInitiatives(content);
    const systemHealth = parseSystemHealth(content);
    const activityLog = parseActivityLog(content);
    const aiInsights = generateAIInsights(initiatives, activityLog);
    return { initiatives, systemHealth, activityLog, aiInsights };
  } catch (error) {
    logger.error({ msg: "[monitoring/dashboard] Failed to parse monitoring data", data: {
      reason: error instanceof Error ? error.message : String(error }),
    });
    return {
      initiatives: [],
      systemHealth: {
        monitoring: "down",
        verification: "down",
        coordination: "down",
        notifications: "down",
      },
      activityLog: [],
      aiInsights: [],
    };
  }
}

/** Parse initiatives from the monitoring file */
function parseInitiatives(content: string): Initiative[] {
  const initiatives: Initiative[] = [];

  // Extract initiatives table data
  const tableMatch = content.match(
    /\| ID \| Initiative Name.*?\n\|.*?\n([\s\S]*?)(?=\n\n|\n\*|$)/,
  );

  if (tableMatch) {
    const tableRows = tableMatch[1]
      .split("\n")
      .filter((line) => line.trim() && line.includes("|"));

    tableRows.forEach((row) => {
      const cells = row
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);

      if (cells.length >= 6) {
        const idMatch = cells[0].match(/INI-\d{4}-\d{2}-\d{2}-\d{3}/);
        if (idMatch) {
          const initiative: Initiative = {
            id: idMatch[0],
            name: cells[1] || "Unknown",
            owner: cells[2] || "Unknown",
            status: mapStatus(cells[3] || "planning"),
            priority: "medium",
            progress: 0,
            verification: mapVerification(cells[5] || "pending"),
            lastUpdate: cells[4] || new Date().toISOString(),
            tasks: [],
          };
          initiatives.push(initiative);
        }
      }
    });
  }

  // Extract detailed initiative sections
  const initiativeRegex =
    /## INITIATIVE: (.*?)\n\*\*ID:\*\* (INI-\d{4}-\d{2}-\d{2}-\d{3})([\s\S]*?)(?=\n## |$)/g;
  let match;
  while ((match = initiativeRegex.exec(content)) !== null) {
    const [, , id, details] = match;
    const existingInitiative = initiatives.find((init) => init.id === id);
    if (!existingInitiative) continue;

    const statusMatch = details.match(/\*\*Status:\*\* (\w+)/);
    const priorityMatch = details.match(/\*\*Priority:\*\* (\w+)/);
    const objectiveMatch = details.match(/### Objective\n([\s\S]*?)(?=\n###)/);

    if (statusMatch) existingInitiative.status = mapStatus(statusMatch[1]);
    if (priorityMatch) existingInitiative.priority = mapPriority(priorityMatch[1]);
    if (objectiveMatch) existingInitiative.description = objectiveMatch[1].trim();

    const criteriaMatch = details.match(
      /### Success Criteria\n([\s\S]*?)(?=\n###)/,
    );
    if (criteriaMatch) {
      const criteria = criteriaMatch[1];
      const tasks = criteria
        .split("\n")
        .filter((line) => line.includes("- ["))
        .map((line, index) => ({
          id: `${id}-task-${index}`,
          content: line.replace(/- \[.\] /, ""),
          status: line.includes("- [x]") ? ("completed" as const) : ("pending" as const),
          priority: existingInitiative.priority,
        }));

      existingInitiative.tasks = tasks;
      existingInitiative.progress = Math.round(
        (tasks.filter((t) => t.status === "completed").length /
          Math.max(tasks.length, 1)) *
          100,
      );
    }

    const blockersMatch = details.match(/block|blocked|issue|problem/gi);
    if (blockersMatch && blockersMatch.length > 2) {
      existingInitiative.blockers = [
        "Potential blockers detected - check progress log",
      ];
    }
  }

  return initiatives;
}

/** Parse system health from monitoring file */
function parseSystemHealth(content: string): SystemHealth {
  const healthSection = content.match(
    /### System Health\n([\s\S]*?)(?=\n\n|---)/,
  );
  if (!healthSection) {
    return {
      monitoring: "down",
      verification: "down",
      coordination: "down",
      notifications: "down",
    };
  }
  const healthText = healthSection[1];
  return {
    monitoring: healthText.includes("✅ **Monitoring System:** Operational")
      ? "operational"
      : "degraded",
    verification: healthText.includes("✅ **Auto-Verification:** Operational")
      ? "operational"
      : "degraded",
    coordination: healthText.includes("✅ **Agent Coordination:** Operational")
      ? "operational"
      : "degraded",
    notifications: healthText.includes(
      "✅ **Notification System:** Operational",
    )
      ? "operational"
      : "degraded",
  };
}

/** Parse activity log from monitoring file */
function parseActivityLog(content: string): ActivityLogEntry[] {
  const activitySection = content.match(
    /## 🔄 RECENT ACTIVITY LOG\n\n([\s\S]*?)(?=\n---|\n## |$)/,
  );
  if (!activitySection) return [];

  const activityText = activitySection[1];
  const entries: ActivityLogEntry[] = [];

  const dateRegex =
    /### (\d{4}-\d{2}-\d{2})\n([\s\S]*?)(?=\n### |\n---|\n## |$)/g;
  let dateMatch;
  while ((dateMatch = dateRegex.exec(activityText)) !== null) {
    const [, date, dateContent] = dateMatch;
    const entryRegex = /- \*\*([\d:]+)\*\* - (.+)/g;
    let entryMatch;
    while ((entryMatch = entryRegex.exec(dateContent)) !== null) {
      const [, time, entryText] = entryMatch;
      const agentMatch = entryText.match(/\[([^\]]+)\]/);
      entries.push({
        timestamp: `${date} ${time}`,
        agent: agentMatch ? agentMatch[1] : "system",
        action: entryText.replace(/\[[^\]]+\]\s*/, ""),
        type: determineEntryType(entryText),
      });
    }
  }

  return entries.slice(0, 50);
}

/** Generate AI insights based on current data */
function generateAIInsights(
  initiatives: Initiative[],
  activityLog: ActivityLogEntry[],
): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date().toISOString();

  const stuckInitiatives = initiatives.filter(
    (init) =>
      init.status === "in-progress" &&
      new Date(init.lastUpdate) <
        new Date(Date.now() - 24 * 60 * 60 * 1000),
  );

  if (stuckInitiatives.length > 0) {
    insights.push({
      type: "bottleneck",
      severity: "high",
      title: "Stalled Initiatives Detected",
      description: `${stuckInitiatives.length} initiative(s) haven't been updated in 24+ hours`,
      suggestion: "Review progress logs and identify blockers preventing completion",
      timestamp: now,
    });
  }

  const failedVerifications = initiatives.filter(
    (init) => init.verification === "failed",
  );
  if (failedVerifications.length > 0) {
    insights.push({
      type: "risk",
      severity: "high",
      title: "Failed Verifications Need Attention",
      description: `${failedVerifications.length} initiative(s) have failed verification`,
      suggestion: "Check verification reports and address quality issues",
      timestamp: now,
    });
  }

  const highPriorityCount = initiatives.filter(
    (init) => init.priority === "high",
  ).length;
  if (highPriorityCount > 3) {
    insights.push({
      type: "optimization",
      severity: "medium",
      title: "Too Many High Priority Items",
      description: `${highPriorityCount} high-priority initiatives may cause resource conflicts`,
      suggestion:
        "Consider reprioritizing or adding more agents to high-priority work",
      timestamp: now,
    });
  }

  const completedToday = initiatives.filter(
    (init) =>
      init.status === "completed" &&
      new Date(init.lastUpdate).toDateString() === new Date().toDateString(),
  );
  if (completedToday.length > 2) {
    insights.push({
      type: "opportunity",
      severity: "low",
      title: "High Productivity Day",
      description: `${completedToday.length} initiatives completed today - great momentum!`,
      suggestion:
        "Consider documenting successful patterns for future use",
      timestamp: now,
    });
  }

  return insights;
}

// Helper functions
function mapStatus(status: string): Initiative["status"] {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes("complete")) return "completed";
  if (lowerStatus.includes("progress")) return "in-progress";
  if (lowerStatus.includes("verification")) return "verification";
  if (lowerStatus.includes("block")) return "blocked";
  return "planning";
}
function mapVerification(verification: string): Initiative["verification"] {
  if (verification.includes("VERIFIED") || verification.includes("✅"))
    return "verified";
  if (verification.includes("FAILED") || verification.includes("❌"))
    return "failed";
  return "pending";
}
function mapPriority(priority: string): Initiative["priority"] {
  const lowerPriority = priority.toLowerCase();
  if (lowerPriority.includes("high")) return "high";
  if (lowerPriority.includes("low")) return "low";
  return "medium";
}
function determineEntryType(entryText: string): ActivityLogEntry["type"] {
  const text = entryText.toLowerCase();
  if (text.includes("error") || text.includes("failed") || text.includes("❌"))
    return "error";
  if (text.includes("warning") || text.includes("⚠️")) return "warning";
  if (
    text.includes("completed") ||
    text.includes("success") ||
    text.includes("✅")
  )
    return "success";
  return "info";
}
export const GET = withApiGuardrails("/api/monitoring/dashboard#GET", async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({
      code: "AUTH_EXPIRED",
      where: "/api/monitoring/dashboard#GET",
      message: "Unauthorized request.",
      status: 401,
    });
  }

  const data = await parseMonitoringData();
  return NextResponse.json(data);
});
