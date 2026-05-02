export const dynamic = "force-dynamic";

import * as React from "react";
import { PageShell } from "@/components/layout";
import { RfisTable } from "./rfis-table";

export default async function RfisPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  return (
    <PageShell variant="table" title="RFIs" showHeader={false}>
      <React.Suspense fallback={null}>
        <RfisTable projectId={numericProjectId} />
      </React.Suspense>
    </PageShell>
  );
}
