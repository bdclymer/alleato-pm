"use client";

import * as React from "react";
import { ArrowRight, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Project {
  id: number;
  name: string;
  "job number": string | null;
}

interface ProjectSelectorProps {
  projectId: number | null;
  currentProject: Project | null;
  projects: Project[];
  loadingProjects: boolean;
  onFetchProjects: () => void;
  onProjectSelect: (projectId: number) => void;
  onViewAll: () => void;
}

/** Deterministic pastel color from a string (project name initial) */
function projectColor(name: string): string {
  const colors = [
    "bg-sky-100 text-sky-700",
    "bg-violet-100 text-violet-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  }
  return colors[hash % colors.length];
}

function ProjectAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const colorClass = projectColor(name);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md font-semibold",
        size === "sm" ? "h-5 w-5 text-[10px]" : "h-7 w-7 text-xs",
        colorClass
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function ProjectSelector({
  projectId,
  currentProject,
  projects,
  loadingProjects,
  onFetchProjects,
  onProjectSelect,
  onViewAll,
}: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) onFetchProjects();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="project-selector-trigger h-8 w-56 justify-between gap-1.5 border border-border/60 bg-surface-soft px-2.5 hover:bg-surface-soft focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {currentProject ? (
              <span className="truncate text-sm text-foreground/80">
                {currentProject.name}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Select project</span>
            )}
          </span>
          <ChevronsUpDown
            className="h-3 w-3 shrink-0 text-muted-foreground/60"
            strokeWidth={1.6}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-[340px] p-0 bg-[#F9FAFB] border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
        {/* Panel header */}
        <div className="border-b border-border/50 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Switch Project
          </span>
        </div>

        <Command
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Search projects..."
            className="h-10 border-0 border-b border-border/40 px-4 text-sm focus:ring-0"
          />
          <CommandList className="max-h-72">
            {loadingProjects ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading projects…
              </div>
            ) : (
              <>
                <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
                  No projects found
                </CommandEmpty>
                <CommandGroup>
                  {projects.map((project) => {
                    const isSelected = project.id === projectId;
                    return (
                      <CommandItem
                        key={project.id}
                        value={`${project.name}${project["job number"] ? ` ${project["job number"]}` : ""}`}
                        onSelect={() => {
                          onProjectSelect(project.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-4 py-2.5",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        <ProjectAvatar name={project.name} />
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm font-medium",
                              isSelected ? "text-primary" : "text-foreground"
                            )}
                          >
                            {project.name}
                          </div>
                          {project["job number"] && (
                            <div className="truncate text-xs text-muted-foreground">
                              {project["job number"]}
                            </div>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0 text-primary",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                          strokeWidth={2}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>

        {/* Footer */}
        <div className="border-t border-border/50">
          <button
            type="button"
            onClick={() => {
              onViewAll();
              setOpen(false);
            }}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            View all projects
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
