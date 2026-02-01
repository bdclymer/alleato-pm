import {
  Home,
  BarChart3,
  FolderOpen,
  Users,
  Table,
  CheckSquare,
  Mail,
  HelpCircle,
  Send,
  FileText,
  ClipboardList,
  Calendar,
  Book,
  Image,
  Pencil,
  FileCheck,
  FileSpreadsheet,
  Wallet,
  Briefcase,
  FileBox,
  Coins,
  Building,
  Receipt,
  Shield,
  LucideIcon
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
  // Helper to build project-scoped URLs
  const projectUrl = (path: string) => projectId ? `/${projectId}/${path}` : `/${path}`;

  return [
    {
      groupLabel: "Core Tools",
      menus: [
        {
          href: projectId ? projectUrl("home") : "/",
          label: "Home",
          icon: Home,
        },
        {
          href: projectUrl("reporting"),
          label: "360 Reporting",
          icon: BarChart3,
        },
        {
          href: projectUrl("documents"),
          label: "Documents",
          icon: FolderOpen,
        },
        {
          href: projectUrl("directory"),
          label: "Directory",
          icon: Users,
        },
        {
          href: projectUrl("tasks"),
          label: "Tasks",
          icon: CheckSquare,
        },
      ]
    },
    {
      groupLabel: "Project Management",
      menus: [
        {
          href: projectUrl("emails"),
          label: "Emails",
          icon: Mail,
        },
        {
          href: projectUrl("rfis"),
          label: "RFIs",
          icon: HelpCircle,
        },
        {
          href: projectUrl("submittals"),
          label: "Submittals",
          icon: Send,
        },
        {
          href: projectUrl("transmittals"),
          label: "Transmittals",
          icon: FileText,
        },
        {
          href: projectUrl("punch-list"),
          label: "Punch List",
          icon: ClipboardList,
        },
        {
          href: projectUrl("meetings"),
          label: "Meetings",
          icon: Calendar,
        },
        {
          href: projectUrl("schedule"),
          label: "Schedule",
          icon: Calendar,
        },
        {
          href: projectUrl("daily-log"),
          label: "Daily Log",
          icon: Book,
        },
        {
          href: projectUrl("photos"),
          label: "Photos",
          icon: Image,
        },
        {
          href: projectUrl("drawings"),
          label: "Drawings",
          icon: Pencil,
        },
        {
          href: projectUrl("specifications"),
          label: "Specifications",
          icon: FileCheck,
        },
      ]
    },
    {
      groupLabel: "Financial Management",
      menus: [
        {
          href: projectUrl("prime-contracts"),
          label: "Prime Contracts",
          icon: FileSpreadsheet,
        },
        {
          href: projectUrl("budget"),
          label: "Budget",
          icon: Wallet,
        },
        {
          href: projectUrl("commitments"),
          label: "Commitments",
          icon: Briefcase,
        },
        {
          href: projectUrl("change-orders"),
          label: "Change Orders",
          icon: FileBox,
        },
        {
          href: projectUrl("change-events"),
          label: "Change Events",
          icon: Coins,
        },
        {
          href: projectUrl("direct-costs"),
          label: "Direct Costs",
          icon: Building,
        },
        {
          href: projectUrl("invoices"),
          label: "Invoicing",
          icon: Receipt,
        },
      ]
    },
    {
      groupLabel: "Admin Tools",
      menus: [
        {
          href: "/tables-directory",
          label: "Tables Directory",
          icon: Table,
        },
      ]
    }
  ];
}
