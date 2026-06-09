"use client";

import { useMemo } from "react";
import {
  buildToolUrl,
  filterToolsByPermission,
  headerNavGroups,
  type HeaderNavigationTool,
} from "@/lib/navigation-config";
import { MegaMenuToolItem } from "./mega-menu-tool-item";

interface MegaMenuPanelProps {
  /** The currently hovered group id — drives which tools show in the featured column */
  activeGroupId: string;
  projectId: number | null;
  activeToolName: string;
  onToolClick: () => void;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Apple-style mega menu: ONE panel, featured column switches on hover
// ─────────────────────────────────────────────────────────────────────────────

// Featured tools per group (shown as large bold text in column 1)
const FEATURED_TOOLS: Record<string, string[]> = {
  finance: ["Estimates", "Budget", "Prime Contracts", "Commitments", "Change Orders", "Direct Costs", "Invoicing", "Change Events"],
  operations: ["Schedule", "Meetings", "Daily Log", "Punch List", "Project Tasks", "RFIs", "Submittals", "Transmittals", "Emails"],
  documents: ["Photos", "Drawings", "Specifications", "Documents", "Progress Reports"],
  company: ["Project Directory"],
};

// Display label for the featured column
const FEATURED_LABELS: Record<string, string> = {
  finance: "Explore Financial",
  operations: "Explore Operations",
  documents: "Explore Documents",
  company: "Explore Project",
};

// ─────────────────────────────────────────────────────────────────────────────
// Section label — muted gray like Apple's "Explore Mac"
// ─────────────────────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export — single panel, featured column transitions
// ─────────────────────────────────────────────────────────────────────────────
export function MegaMenuPanel({
  activeGroupId,
  projectId,
  activeToolName,
  onToolClick,
  permissions,
  isAppAdmin,
  userType,
}: MegaMenuPanelProps) {
  // Collect all tools from all groups into one flat list for lookups
  const allTools = useMemo(
    () => headerNavGroups.flatMap((g) => g.tools),
    []
  );

  // Get the featured tool names for the currently hovered group
  const featuredNames = FEATURED_TOOLS[activeGroupId] || [];
  const featuredLabel = FEATURED_LABELS[activeGroupId] || "Explore";

  // Resolve featured tools from config
  const featuredTools = useMemo(
    () => {
      const tools: HeaderNavigationTool[] = [];
      for (const name of featuredNames) {
        const tool = allTools.find((t) => t.name === name);
        if (tool) tools.push(tool);
      }
      return tools;
    },
    [featuredNames, allTools]
  );

  const visibleFeatured = useMemo(
    () =>
      filterToolsByPermission(
        featuredTools,
        projectId,
        permissions,
        isAppAdmin,
        userType
      ),
    [featuredTools, projectId, permissions, isAppAdmin, userType]
  );

  return (
    <div className="w-screen bg-popover">
      <div className="mx-auto max-w-4xl px-12 py-8">
        {/* Featured column — content transitions per hovered group */}
        <div
          key={activeGroupId}
          className="animate-in fade-in duration-200"
        >
          <SectionLabel label={featuredLabel} />
          <div>
            {featuredTools
              .filter((tool) => !tool.developerOnly || visibleFeatured.includes(tool))
              .map((tool) => {
              const href = buildToolUrl(tool.path, projectId, tool.requiresProject);
              const isActive = tool.name === activeToolName;
              const isDisabled =
                (tool.requiresProject && !projectId) ||
                !visibleFeatured.includes(tool);

              return (
                <MegaMenuToolItem
                  key={tool.name}
                  tool={tool}
                  href={href}
                  isActive={isActive}
                  isDisabled={isDisabled}
                  onClick={onToolClick}
                  variant="featured"
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
