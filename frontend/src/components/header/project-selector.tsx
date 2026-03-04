"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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
          className={cn(
            "h-8 max-w-[200px] border-0 bg-transparent hover:bg-transparent justify-between px-2 focus-visible:ring-0 focus-visible:ring-offset-0",
            !currentProject && "text-zinc-500"
          )}
        >
          {currentProject ? (
            <span className="truncate text-xs sm:text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
              {currentProject.name}
            </span>
          ) : (
            <span className="text-zinc-500 text-xs sm:text-sm">
              Select Project
            </span>
          )}
          <ChevronsUpDown className="ml-1.5 h-3 w-3 shrink-0 text-zinc-600" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[300px] p-0"
      >
        <Command
          filter={(value, search) => {
            if (!search) return 1;
            return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Search projects..." />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>
              {loadingProjects ? "Loading..." : "No projects found"}
            </CommandEmpty>
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name}${project["job number"] ? ` ${project["job number"]}` : ""}`}
                  onSelect={() => {
                    onProjectSelect(project.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      project.id === projectId ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{project.name}</div>
                    {project["job number"] && (
                      <div className="truncate text-xs text-muted-foreground">
                        {project["job number"]}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="view-all-projects"
                onSelect={() => {
                  onViewAll();
                  setOpen(false);
                }}
                className="cursor-pointer font-medium"
              >
                View All Projects
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
