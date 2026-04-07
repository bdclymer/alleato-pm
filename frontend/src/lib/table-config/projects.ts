import { TablePageConfig } from "./types";
import { Project } from "@/types/project";

export const projectsTableConfig: TablePageConfig<Project> = {
  title: "Projects",
  description: "Manage all construction projects",
  table: "projects",
  columns: [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sticky: true,
      linkToRow: true,
    },
    {
      key: "job_number",
      header: "Job Number",
      sortable: true,
    },
    {
      key: "start_date",
      header: "Start Date",
      format: "date",
      sortable: true,
    },
    {
      key: "est_completion_date",
      header: "Est. Completion",
      format: "date",
      sortable: true,
    },
    {
      key: "est_revenue",
      header: "Est. Revenue",
      format: "currency",
      sortable: true,
    },
    {
      key: "est_profit",
      header: "Est. Profit",
      format: "currency",
      sortable: true,
    },
    {
      key: "onedrive",
      header: "OneDrive",
      format: "link",
      linkExternal: true,
    },
    {
      key: "phase",
      header: "Phase",
      format: "badge",
      badgeColors: {
        Planning: "bg-primary/10 text-primary",
        "Pre-Construction": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        Construction: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
        Closeout: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        Complete: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
    },
    {
      key: "state",
      header: "State",
    },
    {
      key: "summary",
      header: "Summary",
      hidden: true,
    },
  ],
  searchableColumns: ["name", "job_number"],
  createRoute: "/projects/new",
  createLabel: "New Project",
  actions: ["view", "edit", "delete"],
  viewRoute: "/projects/:id/home",
  editRoute: "/projects/:id/edit",
  defaultSort: "name",
  defaultSortDirection: "asc",
  filters: {
    archived: false,
    excludePhase: "archive",
    phase: "Current",
  },
  defaultPageSize: 20,
};
