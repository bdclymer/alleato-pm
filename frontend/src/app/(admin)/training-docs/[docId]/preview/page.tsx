import { PageShell } from "@/components/layout";
import { requireAdmin } from "@/app/api/admin/_shared";

import { TrainingDocPreviewClient } from "./training-doc-preview-client";

export default async function TrainingDocPreviewPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  await requireAdmin("training-doc-preview-page");
  const { docId } = await params;

  return (
    <PageShell
      variant="content"
      title="Training Page"
      description="Preview the generated SOP exactly from the app's saved training content."
    >
      <TrainingDocPreviewClient docId={docId} />
    </PageShell>
  );
}
