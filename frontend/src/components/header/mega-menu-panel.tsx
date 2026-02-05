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
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4">
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
              <div key={subGroup.label} className="min-w-[200px]">
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 px-3">
                  {subGroup.label}
                </h4>
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
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {allToolsRequireProject && (
          <div className="mt-4 pt-3 border-t border-zinc-700">
            <p className="text-xs text-amber-500 text-center">
              Select a project to access these tools
            </p>
          </div>
        )}
      </div>
    );
  }

  // No sub-groups - render as a simple list (Company group)
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-4 min-w-[240px]">
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
