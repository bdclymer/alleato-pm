import type { TabConfig } from "@/components/templates/data-table-page";

export function getDirectoryTabs(currentPath: string): TabConfig[] {
  return [
    {
      label: "Companies",
      href: "/directory/companies",
      isActive: currentPath === "/directory/companies",
    },
    {
      label: "Clients",
      href: "/directory/clients",
      isActive: currentPath === "/directory/clients",
    },
    {
      label: "Contacts",
      href: "/directory/contacts",
      isActive: currentPath === "/directory/contacts",
    },
    {
      label: "Access",
      href: "/directory/access",
      isActive: currentPath === "/directory/access",
    },
    {
      label: "Vendors",
      href: "/directory/vendors",
      isActive: currentPath === "/directory/vendors",
    },
    {
      label: "Prospects",
      href: "/directory/prospects",
      isActive: currentPath === "/directory/prospects",
    },
    {
      label: "Distribution Groups",
      href: "/directory/groups",
      isActive: currentPath === "/directory/groups",
    },
  ];
}

export function getAccessControlTabs(currentPath: string): TabConfig[] {
  return [
    {
      label: "Users",
      href: "/directory/users",
      isActive: currentPath === "/directory/users",
    },
    {
      label: "Permissions",
      href: "/directory/permissions",
      isActive: currentPath === "/directory/permissions",
    },
    {
      label: "Templates",
      href: "/directory/templates",
      isActive: currentPath === "/directory/templates",
    },
  ];
}

export function getProjectDirectoryTabs(
  projectId: string,
  currentPath: string,
): TabConfig[] {
  return [
    {
      label: "All",
      href: `/${projectId}/directory/all`,
      isActive: currentPath === `/${projectId}/directory/all`,
    },
    {
      label: "Companies",
      href: `/${projectId}/directory/companies`,
      isActive: currentPath === `/${projectId}/directory/companies`,
    },
    {
      label: "Distribution Groups",
      href: `/${projectId}/directory/groups`,
      isActive: currentPath === `/${projectId}/directory/groups`,
    },
  ];
}
