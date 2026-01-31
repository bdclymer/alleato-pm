"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ProjectPageHeader } from "@/components/layout/ProjectPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageTabs } from "@/components/layout/PageTabs";
import { Text } from "@/components/ui/text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDirectoryTabs, getAccessControlTabs } from "@/config/directory-tabs";

const accessTables = [
  {
    name: "people",
    description:
      "Global directory of every person (workers, contacts, users). Each row is the anchor for project memberships.",
    highlights: [
      "person_type (user/contact)",
      "status (active/inactive)",
      "company_id → companies",
      "email + phone + metadata",
    ],
  },
  {
    name: "users_auth",
    description:
      "Joins Supabase auth users to the people table. Without a row here, the person cannot sign in.",
    highlights: ["person_id → people", "auth_user_id → auth.users"],
  },
  {
    name: "user_profiles",
    description:
      "App-level profile tied to auth users. The `is_admin` flag here bypasses every permission check.",
    highlights: ["id = auth.users.id", "is_admin boolean"],
  },
  {
    name: "project_directory_memberships",
    description:
      "Core join table that grants a person access to a project with a permission template.",
    highlights: [
      "project_id", 
      "permission_template_id → permission_templates",
      "status/invite_status", 
      "user_type + metadata",
    ],
  },
  {
    name: "permission_templates",
    description:
      "Defines module-level rules (directory, contracts, documents, etc.). Templates are project-scoped.",
    highlights: ["name + scope", "rules_json (read/write/admin per module)", "is_system"],
  },
  {
    name: "user_directory_permissions",
    description:
      "Optional overrides per person/project for fine-grained access without touching the template.",
    highlights: ["permission_level", "person_id + project_id"],
  },
];

export default function DirectoryAccessPage() {
  const pathname = usePathname();
  const directoryTabs = getDirectoryTabs(pathname);
  const accessTabs = getAccessControlTabs(pathname);

  return (
    <>
      <ProjectPageHeader
        title="Access Controls"
        description="See every table that governs who can sign in and what they can do."
        showProjectName={false}
      />
      <PageTabs tabs={directoryTabs} />
      <PageTabs tabs={accessTabs} />
      <PageContainer>
        <div className="space-y-6">
          <Text tone="muted">
            Every table below participates in the login → person → project flow. Editing rows here
            is the only way to add new people, map them to auth users, or build templates that grant
            read/write/admin rights inside the directory.
          </Text>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accessTables.map((table) => (
            <Card key={table.name} className="border-none shadow-none">
                <CardHeader className="flex flex-col gap-2 pb-0 px-0">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Badge variant="secondary">{table.name}</Badge>
                    <span className="text-base text-muted-foreground">Access table</span>
                  </CardTitle>
                  <Text size="sm">{table.description}</Text>
                </CardHeader>
                <CardContent className="pt-0 px-0 pb-2">
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {table.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
