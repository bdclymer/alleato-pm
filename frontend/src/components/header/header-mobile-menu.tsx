"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  headerNavGroups,
  adminSettingsTools,
  buildToolUrl,
  filterToolsByPermission,
} from "@/lib/navigation-config";
import { ProjectSelector } from "./project-selector";

interface Project {
  id: number;
  name: string;
  "job number": string | null;
}

interface HeaderMobileMenuProps {
  projectId: number | null;
  currentProject: Project | null;
  activeToolName: string;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  projects: Project[];
  loadingProjects: boolean;
  onFetchProjects: () => void;
  onProjectSelect: (projectId: number) => void;
  onViewAll: () => void;
}

export function HeaderMobileMenu({
  projectId,
  currentProject,
  activeToolName,
  permissions,
  isAppAdmin,
  userType,
  projects,
  loadingProjects,
  onFetchProjects,
  onProjectSelect,
  onViewAll,
}: HeaderMobileMenuProps) {
  const [open, setOpen] = useState(false);

  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-2 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          {/* Project Selector */}
          <div className="p-4 border-b">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Current Project
            </label>
            <ProjectSelector
              projectId={projectId}
              currentProject={currentProject}
              projects={projects}
              loadingProjects={loadingProjects}
              onFetchProjects={onFetchProjects}
              onProjectSelect={(id) => {
                onProjectSelect(id);
                closeMenu();
              }}
              onViewAll={() => {
                onViewAll();
                closeMenu();
              }}
            />
          </div>

          {/* Navigation Groups */}
          <div className="py-4 space-y-6">
            {headerNavGroups.map((group) => {
              const visibleTools = filterToolsByPermission(
                group.tools,
                projectId,
                permissions,
                isAppAdmin,
                userType
              );

              return (
                <div key={group.id}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-4">
                    {group.label}
                  </h3>
                  <div className="space-y-0.5">
                    {group.tools.map((tool) => {
                      const href = buildToolUrl(
                        tool.path,
                        projectId,
                        tool.requiresProject
                      );
                      const isActive = tool.name === activeToolName;
                      const isDisabled =
                        (tool.requiresProject && !projectId) ||
                        !visibleTools.includes(tool);
                      const Icon = tool.icon;

                      return (
                        <Link
                          key={tool.name}
                          href={href}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault();
                            } else {
                              closeMenu();
                            }
                          }}
                          className={cn(
                            "flex items-center gap-4 px-4 py-2.5 text-sm transition-colors",
                            isDisabled
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-muted active:bg-muted/80",
                            isActive && "bg-muted font-medium"
                          )}
                        >
                          {Icon && (
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            />
                          )}
                          <span>{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Admin Tools Section */}
            {(() => {
              const visibleAdminTools = filterToolsByPermission(
                adminSettingsTools,
                projectId,
                permissions,
                isAppAdmin,
                userType
              );

              if (visibleAdminTools.length === 0) return null;

              return (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-4">
                    Settings & Admin
                  </h3>
                  <div className="space-y-0.5">
                    {adminSettingsTools.map((tool) => {
                      const href = buildToolUrl(
                        tool.path,
                        projectId,
                        tool.requiresProject
                      );
                      const isActive = tool.name === activeToolName;
                      const isDisabled =
                        (tool.requiresProject && !projectId) ||
                        !visibleAdminTools.includes(tool);
                      const Icon = tool.icon;

                      return (
                        <Link
                          key={tool.name}
                          href={href}
                          onClick={(e) => {
                            if (isDisabled) {
                              e.preventDefault();
                            } else {
                              closeMenu();
                            }
                          }}
                          className={cn(
                            "flex items-center gap-4 px-4 py-2.5 text-sm transition-colors",
                            isDisabled
                              ? "opacity-40 cursor-not-allowed"
                              : "hover:bg-muted active:bg-muted/80",
                            isActive && "bg-muted font-medium"
                          )}
                        >
                          {Icon && (
                            <Icon
                              className={cn(
                                "h-4 w-4",
                                isActive
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              )}
                            />
                          )}
                          <span>{tool.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
