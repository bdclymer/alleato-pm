"use client";

import { useMemo } from "react";
import {
  buildToolUrl,
  filterToolsByPermission,
  type HeaderNavGroup,
} from "@/lib/navigation-config";
import { MegaMenuToolItem } from "./mega-menu-tool-item";

interface MegaMenuPanelProps {
  group: HeaderNavGroup;
  projectId: number | null;
  activeToolName: string;
  onToolClick: () => void;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Direction 1: Structured Discipline Panel
//
// Three discipline sections (Planning / Finance / Company) divided by hairline
// vertical borders. Planning splits into 2 sub-columns for its 12 tools.
// Finance stacks 3 sub-groups vertically. Company is a compact list.
// Each tool row shows icon + name + description (2-line layout).
// Active tool gets a distinct primary-tinted background.
// ─────────────────────────────────────────────────────────────────────────────

// Sub-group label constants matching navigation-config.ts toolNames
const PLANNING_SCHEDULING = ["Schedule", "Meetings", "Daily Log", "Punch List"];
const PLANNING_CORRESPONDENCE = ["RFIs", "Submittals", "Transmittals", "Emails"];
const PLANNING_DOCUMENTS = ["Photos", "Drawings", "Specifications", "Documents"];

const FINANCE_BUDGETING = ["Budget", "Direct Costs"];
const FINANCE_CONTRACTS = ["Prime Contracts", "Commitments", "Invoicing"];
const FINANCE_CHANGES = ["Change Orders", "Change Events"];

const COMPANY_TOOLS = ["Projects", "Company Directory", "360 Reporting"];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-group heading
// ─────────────────────────────────────────────────────────────────────────────
function SubGroupLabel({ label }: { label: string }) {
  return (
    <div className="mb-1.5 px-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Renders a named sub-group of tools (label + list of rows)
// ─────────────────────────────────────────────────────────────────────────────
interface ToolSubGroupProps {
  label: string;
  toolNames: string[];
  allTools: HeaderNavGroup["tools"];
  projectId: number | null;
  activeToolName: string;
  onToolClick: () => void;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  showDescription?: boolean;
}

function ToolSubGroup({
  label,
  toolNames,
  allTools,
  projectId,
  activeToolName,
  onToolClick,
  permissions,
  isAppAdmin,
  userType,
  showDescription = true,
}: ToolSubGroupProps) {
  const tools = allTools.filter((t) => toolNames.includes(t.name));
  const visibleTools = filterToolsByPermission(
    tools,
    projectId,
    permissions,
    isAppAdmin,
    userType
  );

  if (visibleTools.length === 0) return null;

  return (
    <div>
      <SubGroupLabel label={label} />
      <div className="space-y-0.5">
        {tools.map((tool) => {
          const href = buildToolUrl(tool.path, projectId, tool.requiresProject);
          const isActive = tool.name === activeToolName;
          const isDisabled =
            (tool.requiresProject && !projectId) ||
            !visibleTools.includes(tool);

          return (
            <MegaMenuToolItem
              key={tool.name}
              tool={tool}
              href={href}
              isActive={isActive}
              isDisabled={isDisabled}
              onClick={onToolClick}
              showDescription={showDescription}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Discipline column heading
// ─────────────────────────────────────────────────────────────────────────────
function DisciplineLabel({ label }: { label: string }) {
  return (
    <div className="mb-3 pb-2 border-b border-border/60">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export function MegaMenuPanel({
  group,
  projectId,
  activeToolName,
  onToolClick,
  permissions,
  isAppAdmin,
  userType,
}: MegaMenuPanelProps) {
  const visibleTools = useMemo(
    () =>
      filterToolsByPermission(
        group.tools,
        projectId,
        permissions,
        isAppAdmin,
        userType
      ),
    [group.tools, projectId, permissions, isAppAdmin, userType]
  );

  const allToolsRequireProject = useMemo(
    () => !projectId && group.tools.every((tool) => tool.requiresProject),
    [projectId, group.tools]
  );

  // ── Shared props for ToolSubGroup ──────────────────────────────────────────
  const subGroupProps = {
    allTools: group.tools,
    projectId,
    activeToolName,
    onToolClick,
    permissions,
    isAppAdmin,
    userType,
  };

  // ── "Tools" mega-menu: the unified Planning + Finance + Company panel ──────
  if (group.id === "tools") {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden w-max">
        <div className="flex divide-x divide-border">

          {/* ── PLANNING ──────────────────────────────────────────────────── */}
          <div className="flex-1 p-4 min-w-0">
            <DisciplineLabel label="Planning" />

            {/* Two sub-columns: Scheduling+Correspondence | Documents */}
            <div className="grid grid-cols-2 gap-x-3">
              {/* Left sub-column */}
              <div className="space-y-4">
                <ToolSubGroup
                  label="Scheduling"
                  toolNames={PLANNING_SCHEDULING}
                  showDescription={false}
                  {...subGroupProps}
                />
                <ToolSubGroup
                  label="Correspondence"
                  toolNames={PLANNING_CORRESPONDENCE}
                  showDescription={false}
                  {...subGroupProps}
                />
              </div>

              {/* Right sub-column */}
              <div>
                <ToolSubGroup
                  label="Documents"
                  toolNames={PLANNING_DOCUMENTS}
                  showDescription={false}
                  {...subGroupProps}
                />
              </div>
            </div>
          </div>

          {/* ── FINANCE ───────────────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 p-4">
            <DisciplineLabel label="Finance" />
            <div className="space-y-4">
              <ToolSubGroup
                label="Budgeting"
                toolNames={FINANCE_BUDGETING}
                showDescription={false}
                {...subGroupProps}
              />
              <ToolSubGroup
                label="Contracts"
                toolNames={FINANCE_CONTRACTS}
                showDescription={false}
                {...subGroupProps}
              />
              <ToolSubGroup
                label="Changes"
                toolNames={FINANCE_CHANGES}
                showDescription={false}
                {...subGroupProps}
              />
            </div>
          </div>

          {/* ── COMPANY ───────────────────────────────────────────────────── */}
          <div className="w-52 flex-shrink-0 p-4">
            <DisciplineLabel label="Company" />
            <div className="space-y-0.5">
              {group.tools
                .filter((t) => COMPANY_TOOLS.includes(t.name))
                .map((tool) => {
                  const href = buildToolUrl(
                    tool.path,
                    projectId,
                    tool.requiresProject
                  );
                  const isActive = tool.name === activeToolName;
                  const isDisabled =
                    (tool.requiresProject && !projectId) ||
                    !visibleTools.includes(tool);
                  return (
                    <MegaMenuToolItem
                      key={tool.name}
                      tool={tool}
                      href={href}
                      isActive={isActive}
                      isDisabled={isDisabled}
                      onClick={onToolClick}
                      showDescription={false}
                    />
                  );
                })}
            </div>
          </div>
        </div>

        {/* ── No-project warning ──────────────────────────────────────────── */}
        {allToolsRequireProject && (
          <div className="border-t border-border bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Select a project above to enable project tools
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Individual discipline groups (Planning / Finance / Company) ────────────
  if (group.subGroups && group.subGroups.length > 0) {
    return (
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex divide-x divide-border">
          {group.subGroups.map((subGroup) => {
            const subGroupTools = group.tools.filter((tool) =>
              subGroup.toolNames.includes(tool.name)
            );
            const visibleSubGroupTools = filterToolsByPermission(
              subGroupTools,
              projectId,
              permissions,
              isAppAdmin,
              userType
            );

            if (visibleSubGroupTools.length === 0) return null;

            return (
              <div key={subGroup.label} className="min-w-[160px] p-4">
                <SubGroupLabel label={subGroup.label} />
                <div className="space-y-0.5">
                  {subGroupTools.map((tool) => {
                    const href = buildToolUrl(
                      tool.path,
                      projectId,
                      tool.requiresProject
                    );
                    const isActive = tool.name === activeToolName;
                    const isDisabled =
                      (tool.requiresProject && !projectId) ||
                      !visibleSubGroupTools.includes(tool);

                    return (
                      <MegaMenuToolItem
                        key={tool.name}
                        tool={tool}
                        href={href}
                        isActive={isActive}
                        isDisabled={isDisabled}
                        onClick={onToolClick}
                        showDescription={false}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {allToolsRequireProject && (
          <div className="border-t border-border bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              Select a project above to enable project tools
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── Simple list (Company standalone group) ────────────────────────────────
  return (
    <div className="w-56 rounded-lg border border-border bg-card shadow-sm p-3">
      <div className="space-y-0.5">
        {group.tools.map((tool) => {
          const href = buildToolUrl(tool.path, projectId, tool.requiresProject);
          const isActive = tool.name === activeToolName;
          const isDisabled =
            (tool.requiresProject && !projectId) ||
            !visibleTools.includes(tool);

          return (
            <MegaMenuToolItem
              key={tool.name}
              tool={tool}
              href={href}
              isActive={isActive}
              isDisabled={isDisabled}
              onClick={onToolClick}
              showDescription={false}
            />
          );
        })}
      </div>
    </div>
  );
}
