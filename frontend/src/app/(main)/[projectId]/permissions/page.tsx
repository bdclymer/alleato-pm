"use client";

import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout";
import { MembersTab } from "../admin/_components/members-tab";

export default function ProjectPermissionsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <PageShell
      variant="content"
      title="Project Permissions"
      description="Assign permission templates and module-level overrides for every member of this project."
    >
      <MembersTab projectId={projectId} />
    </PageShell>
  );
}
