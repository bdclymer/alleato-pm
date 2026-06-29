export const dynamic = "force-dynamic";

import { requireAdmin } from "@/app/api/admin/_shared";
import { PageShell } from "@/components/layout";

import { TrainingDocsClient } from "./training-docs-client";

export default async function TrainingDocsPage() {
  await requireAdmin("training-docs-page");

  return (
    <PageShell
      variant="content"
      title="Training Docs"
      description="Draft, review, and publish internal SOPs to the Alleato OS docs site."
    >
      <TrainingDocsClient />
    </PageShell>
  );
}
