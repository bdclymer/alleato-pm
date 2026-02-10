"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  return (
    <Select
      value={projectId?.toString() || ""}
      onValueChange={(value) => {
        if (value === "view-all") {
          onViewAll();
        } else {
          onProjectSelect(parseInt(value));
        }
      }}
      onOpenChange={(open) => open && onFetchProjects()}
    >
      <SelectTrigger className="h-8 w-[120px] sm:w-[160px] lg:w-[200px] border-0 bg-zinc-700/60 hover:bg-zinc-600/70 focus:ring-0 focus:ring-offset-0">
        <SelectValue placeholder="Select Project">
          {currentProject ? (
            <span className="font-medium truncate text-xs sm:text-sm text-white">
              {currentProject.name}
            </span>
          ) : (
            <span className="text-zinc-300 text-xs sm:text-sm">
              Select Project
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Recent Projects</SelectLabel>
          {loadingProjects ? (
            <div className="py-2 px-2 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : projects.length > 0 ? (
            projects.slice(0, 10).map((project) => (
              <SelectItem
                key={project.id}
                value={project.id.toString()}
                className="h-auto py-2"
              >
                <span className="font-medium truncate">{project.name}</span>
              </SelectItem>
            ))
          ) : (
            <div className="py-2 px-2 text-center text-sm text-muted-foreground">
              No projects found
            </div>
          )}
        </SelectGroup>
        <SelectGroup>
          <SelectItem value="view-all" className="font-medium h-auto py-2">
            View All Projects
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
