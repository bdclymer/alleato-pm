"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  buildToolUrl,
  filterToolsByPermission,
  type HeaderNavGroup,
  type HeaderNavigationTool,
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

export function MegaMenuPanel({
  group,
  projectId,
  activeToolName,
  onToolClick,
  permissions,
  isAppAdmin,
  userType,
}: MegaMenuPanelProps) {
  // Filter tools by permissions
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

  // Check if all visible tools require a project and none is selected
  const allToolsRequireProject = useMemo(
    () =>
      !projectId &&
      group.tools.every((tool) => tool.requiresProject),
    [projectId, group.tools]
  );

  // If there are sub-groups, render them as columns
  if (group.subGroups && group.subGroups.length > 0) {
    return (
      <div className="rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
        <div className="flex gap-6">
          {group.subGroups.map((subGroup) => {
            // Get tools for this sub-group
            const subGroupTools = group.tools.filter((tool) =>
              subGroup.toolNames.includes(tool.name)
            );

            // Filter by permissions
            const visibleSubGroupTools = filterToolsByPermission(
              subGroupTools,
              projectId,
              permissions,
              isAppAdmin,
              userType
            );

            if (visibleSubGroupTools.length === 0) return null;

            return (
              <div key={subGroup.label} className="w-56">
                <h4 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {subGroup.label}
                </h4>
                <div
                  className={cn(
                    "space-y-0.5",
                    subGroup.columns === 2 && "grid grid-cols-2 gap-x-2 gap-y-0.5 space-y-0"
                  )}
                >
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
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {allToolsRequireProject && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-center text-xs text-status-warning">
              Select a project to access these tools
            </p>
          </div>
        )}
      </div>
    );
  }

  // No sub-groups - render as a simple list (Company group)
  return (
    <div className="w-60 rounded-lg border border-border bg-background/95 p-4 shadow-lg backdrop-blur-sm">
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
            />
          );
        })}
      </div>
    </div>
  );
}
