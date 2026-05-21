"use client";

import Link from "next/link";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { cn } from "@/lib/utils";
import type { HeaderNavGroup } from "@/lib/navigation-config";
import {
  headerNavGroups,
  buildToolUrl,
  filterToolsByPermission,
} from "@/lib/navigation-config";

interface ToolsDropdownProps {
  projectId: number | null;
  activeToolName: string | null;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  allToolsRequireProject: boolean;
  onClose: () => void;
}

// Shared tool link renderer
function ToolLink({
  tool,
  projectId,
  isActive,
  isDisabled,
  onClose,
}: {
  tool: HeaderNavGroup["tools"][0];
  projectId: number | null;
  isActive: boolean;
  isDisabled: boolean;
  onClose: () => void;
}) {
  const href = buildToolUrl(tool.path, projectId, tool.requiresProject);

  return (
      <Link
        href={href}
        onClick={(e) => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
          onClose();
        }}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isDisabled ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-100",
          isActive && "bg-zinc-100"
        )}
      >
        {tool.icon && (
          <tool.icon
            className={cn(
              "h-4 w-4 shrink-0",
              isActive ? "text-zinc-900" : "text-zinc-500"
            )}
          />
        )}
        <span
          className={cn(
            "whitespace-nowrap",
            isActive ? "text-zinc-900 font-semibold" : "text-zinc-700"
          )}
        >
          {tool.name}
        </span>
      </Link>
  );
}

// Section header
function SectionHeader({ label }: { label: string }) {
  return <SectionRuleHeading label={label} className="mb-3 px-2.5" />;
}

// Warning footer
function ProjectWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="mt-5 border-t border-border pt-3">
      <p className="text-center text-xs text-status-warning">
        Select a project to access project tools
      </p>
    </div>
  );
}

// Helper to get tool state
function getToolState(
  tool: HeaderNavGroup["tools"][0],
  visibleTools: HeaderNavGroup["tools"],
  activeToolName: string | null,
  projectId: number | null
) {
  return {
    isActive: tool.name === activeToolName,
    isDisabled:
      (tool.requiresProject && !projectId) || !visibleTools.includes(tool),
  };
}

// Tool names for each column
const FINANCIAL_TOOLS = [
  "Budget",
  "Prime Contracts",
  "Commitments",
  "Change Orders",
  "Change Events",
  "Direct Costs",
  "Invoicing",
];

const OPERATIONS_TOOLS = [
  "Schedule",
  "Meetings",
  "Daily Log",
  "Punch List",
  "RFIs",
  "Submittals",
  "Transmittals",
  "Emails",
];

const FILES_TOOLS = ["Photos", "Drawings", "Specifications", "Documents", "Progress Reports"];

const COMPANY_TOOLS = ["Project Directory", "Project Tasks"];

export function ToolsDropdownContent(props: ToolsDropdownProps) {
  // Collect all tools from all groups into a flat lookup
  const allToolsMap = new Map(
    headerNavGroups.flatMap((g) => g.tools).map((t) => [t.name, t])
  );

  // Get visible tools for permission filtering
  const allVisible = headerNavGroups.flatMap((g) =>
    filterToolsByPermission(
      g.tools,
      props.projectId,
      props.permissions,
      props.isAppAdmin,
      props.userType
    )
  );

  const renderColumn = (toolNames: string[]) => {
    const tools = toolNames
      .map((name) => allToolsMap.get(name))
      .filter(
        (t): t is HeaderNavGroup["tools"][0] => t !== undefined
      );

    return tools.map((tool) => {
      const state = getToolState(
        tool,
        allVisible,
        props.activeToolName,
        props.projectId
      );
      return (
        <ToolLink
          key={tool.name}
          tool={tool}
          projectId={props.projectId}
          isActive={state.isActive}
          isDisabled={state.isDisabled}
          onClose={props.onClose}
        />
      );
    });
  };

  return (
    <div className="w-full max-w-5xl p-5 sm:p-7">
      <div className="flex gap-8 overflow-x-auto sm:gap-12">
        {/* Financial */}
        <div className="shrink-0">
          <SectionHeader label="Financial" />
          <div className="space-y-0.5">{renderColumn(FINANCIAL_TOOLS)}</div>
        </div>

        {/* Operations */}
        <div className="shrink-0">
          <SectionHeader label="Operations" />
          <div className="space-y-0.5">{renderColumn(OPERATIONS_TOOLS)}</div>
        </div>

        {/* Documents */}
        <div className="shrink-0">
          <SectionHeader label="Documents" />
          <div className="space-y-0.5">{renderColumn(FILES_TOOLS)}</div>
        </div>

        {/* Company */}
        <div className="shrink-0">
          <SectionHeader label="Company" />
          <div className="space-y-0.5">{renderColumn(COMPANY_TOOLS)}</div>
        </div>
      </div>

      <ProjectWarning show={props.allToolsRequireProject} />
    </div>
  );
}
