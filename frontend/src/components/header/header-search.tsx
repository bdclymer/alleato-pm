"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  buildToolUrl,
  companyWideHeaderTools,
  filterToolsByPermission,
  headerNavGroups,
  type HeaderNavigationTool,
} from "@/lib/navigation-config";
import { cn } from "@/lib/utils";

interface HeaderSearchProject {
  id: number;
  name: string | null;
  "job number": string | null;
}

interface HeaderSearchProps {
  projectId: number | null;
  projects: HeaderSearchProject[];
  loadingProjects: boolean;
  onFetchProjects: () => void;
  permissions: Record<string, string[]>;
  isAppAdmin: boolean;
  userType: string | null;
  isDeveloper: boolean;
}

function getToolHref(
  tool: HeaderNavigationTool,
  projectId: number | null,
): string {
  return buildToolUrl(tool.path, projectId, tool.requiresProject !== false);
}

export function HeaderSearch({
  projectId,
  projects,
  loadingProjects,
  onFetchProjects,
  permissions,
  isAppAdmin,
  userType,
  isDeveloper,
}: HeaderSearchProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (open && projects.length === 0 && !loadingProjects) {
      onFetchProjects();
    }
  }, [loadingProjects, onFetchProjects, open, projects.length]);

  const projectTools = React.useMemo(() => {
    return headerNavGroups.flatMap((group) =>
      filterToolsByPermission(
        group.tools,
        projectId,
        permissions,
        isAppAdmin,
        userType,
        isDeveloper,
      ).map((tool) => ({ ...tool, groupLabel: group.label })),
    );
  }, [isAppAdmin, isDeveloper, permissions, projectId, userType]);

  const companyTools = React.useMemo(() => {
    return filterToolsByPermission(
      companyWideHeaderTools,
      projectId,
      permissions,
      isAppAdmin,
      userType,
      isDeveloper,
    );
  }, [isAppAdmin, isDeveloper, permissions, projectId, userType]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          "h-8 w-44 justify-start gap-2 rounded-md border-border/70 bg-background px-2.5 text-muted-foreground shadow-none",
          "hover:bg-accent hover:text-foreground lg:w-56",
        )}
        aria-label="Search projects and tools"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="truncate text-xs font-normal">Search</span>
        <kbd className="ml-auto hidden h-5 items-center gap-1 rounded border border-border/70 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          <span>⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search projects and tools."
        className="max-w-xl"
      >
        <CommandInput placeholder="Search projects and tools..." />
        <CommandList className="max-h-96">
          <CommandEmpty>No matching projects or tools.</CommandEmpty>

          <CommandGroup heading="Project Tools">
            {projectTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <CommandItem
                  key={`${tool.groupLabel}-${tool.path}`}
                  value={`${tool.name} ${tool.description ?? ""} ${tool.groupLabel}`}
                  onSelect={() => navigate(getToolHref(tool, projectId))}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{tool.name}</div>
                    {tool.description ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {tool.description}
                      </div>
                    ) : null}
                  </div>
                  <CommandShortcut>{tool.groupLabel}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Company">
            {companyTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <CommandItem
                  key={`company-${tool.path || "projects"}`}
                  value={`${tool.name} ${tool.description ?? ""}`}
                  onSelect={() => navigate(getToolHref(tool, projectId))}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{tool.name}</div>
                    {tool.description ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {tool.description}
                      </div>
                    ) : null}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {projects.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((project) => {
                  const projectName =
                    project.name?.trim() || "Untitled project";
                  const jobNumber = project["job number"]?.trim();
                  return (
                    <CommandItem
                      key={project.id}
                      value={`${projectName} ${jobNumber ?? ""}`}
                      onSelect={() => navigate(`/${project.id}/home`)}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {projectName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm">{projectName}</div>
                        {jobNumber ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {jobNumber}
                          </div>
                        ) : null}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
