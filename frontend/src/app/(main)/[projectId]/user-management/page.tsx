"use client";

import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout";
import { MembersTab } from "../admin/_components/members-tab";

export default function ProjectPermissionsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <PageShell
      variant="content"
      title="Project User Management"
      description="Assign project roles and module-level access for every member of this project."
    >
      <MembersTab projectId={projectId} />
    </PageShell>
  );
}
