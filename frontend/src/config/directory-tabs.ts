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
      label: "Users",
      href: "/directory/users",
      isActive: currentPath === "/directory/users",
    },
    {
      label: "Distribution Groups",
      href: "/directory/groups",
      isActive: currentPath === "/directory/groups",
    },
  ];
}

export function getProjectDirectoryTabs(
  projectId: string,
  currentPath: string,
): TabConfig[] {
  return [
    {
      label: "Users",
      href: `/${projectId}/directory/users`,
      isActive: currentPath === `/${projectId}/directory/users`,
    },
    {
      label: "Contacts",
      href: `/${projectId}/directory/contacts`,
      isActive: currentPath === `/${projectId}/directory/contacts`,
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
