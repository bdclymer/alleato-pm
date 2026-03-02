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
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredProjects = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const name = project.name.toLowerCase();
      const jobNumber = project["job number"]?.toLowerCase() ?? "";
      return name.includes(query) || jobNumber.includes(query);
    });
  }, [projects, searchQuery]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) onFetchProjects();
    if (!nextOpen) setSearchQuery("");
  };

  const handleProjectSelect = (value: string) => {
    const selectedProjectId = Number.parseInt(value, 10);
    if (!Number.isNaN(selectedProjectId)) {
      onProjectSelect(selectedProjectId);
      setOpen(false);
    }
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
            "h-8 w-[120px] sm:w-[160px] lg:w-[200px] border-0 bg-zinc-700/60 hover:bg-zinc-600/70 justify-between px-4 focus-visible:ring-0 focus-visible:ring-offset-0",
            !currentProject && "text-zinc-300"
          )}
        >
          {currentProject ? (
            <span className="font-medium truncate text-xs sm:text-sm text-white">
              {currentProject.name}
            </span>
          ) : (
            <span className="text-zinc-300 text-xs sm:text-sm">
              Select Project
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[300px] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search projects..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>
              {loadingProjects ? "Loading..." : "No projects found"}
            </CommandEmpty>
            <CommandGroup heading="Projects">
              {filteredProjects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id.toString()}
                  onSelect={handleProjectSelect}
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
                value="view-all"
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
