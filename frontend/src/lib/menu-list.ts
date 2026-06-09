import {
  Home,
  FolderOpen,
  Users,
  Mail,
  Calendar,
  FileSpreadsheet,
  FileBox,
  Camera,
  FileImage,
  LucideIcon,
  TrendingUp,
  BookOpen,
} from "lucide-react";

type Submenu = {
  href: string;
  label: string;
  active?: boolean;
};

type Menu = {
  href: string;
  label: string;
  active?: boolean;
  icon: LucideIcon;
  submenus?: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string, projectId?: string): Group[] {
  const projectUrl = (path: string) => projectId ? `/${projectId}/${path}` : `/${path}`;

  return [
    {
      groupLabel: "",
      menus: [
        {
          href: projectId ? projectUrl("home") : "/",
          label: "Home",
          icon: Home,
        },
      ],
    },
    {
      groupLabel: "Financial",
      menus: [
        {
          href: "#",
          label: "Budgeting",
          icon: TrendingUp,
          submenus: [
            { href: projectUrl("estimates"), label: "Estimates" },
            { href: projectUrl("budget"), label: "Budget" },
            { href: projectUrl("direct-costs"), label: "Direct Costs" },
          ],
        },
        {
          href: "#",
          label: "Contracts",
          icon: FileSpreadsheet,
          submenus: [
            { href: projectUrl("prime-contracts"), label: "Prime Contracts" },
            { href: projectUrl("commitments"), label: "Commitments" },
            { href: projectUrl("invoices"), label: "Invoicing" },
          ],
        },
        {
          href: "#",
          label: "Changes",
          icon: FileBox,
          submenus: [
            { href: projectUrl("change-orders"), label: "Change Orders" },
            { href: projectUrl("change-events"), label: "Change Events" },
          ],
        },
      ],
    },
    {
      groupLabel: "Operations",
      menus: [
        {
          href: "#",
          label: "Field",
          icon: Calendar,
          submenus: [
            { href: projectUrl("schedule"), label: "Schedule" },
            { href: projectUrl("meetings"), label: "Meetings" },
            { href: projectUrl("daily-log"), label: "Daily Log" },
            { href: projectUrl("punch-list"), label: "Punch List" },
            { href: projectUrl("tasks"), label: "Project Tasks" },
          ],
        },
        {
          href: "#",
          label: "Correspondence",
          icon: Mail,
          submenus: [
            { href: projectUrl("rfis"), label: "RFIs" },
            { href: projectUrl("submittals"), label: "Submittals" },
            { href: projectUrl("transmittals"), label: "Transmittals" },
            { href: projectUrl("emails"), label: "Emails" },
          ],
        },
      ],
    },
    {
      groupLabel: "Documents",
      menus: [
        {
          href: projectUrl("photos"),
          label: "Photos",
          icon: Camera,
        },
        {
          href: projectUrl("drawings"),
          label: "Drawings",
          icon: FileImage,
        },
        {
          href: projectUrl("specifications"),
          label: "Specifications",
          icon: BookOpen,
        },
        {
          href: projectUrl("documents"),
          label: "Documents",
          icon: FolderOpen,
        },
      ],
    },
    {
      groupLabel: "Project",
      menus: [
        {
          href: projectUrl("directory"),
          label: "Project Directory",
          icon: Users,
        },
      ],
    },
  ];
}
