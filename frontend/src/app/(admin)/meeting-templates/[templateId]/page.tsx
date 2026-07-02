export const dynamic = "force-dynamic";

import { requireAdmin } from "@/app/api/admin/_shared";

import { MeetingTemplateEditorClient } from "./meeting-template-editor-client";

export default async function MeetingTemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requireAdmin("meeting-templates-editor-page");
  const { templateId } = await params;

  return <MeetingTemplateEditorClient templateId={templateId} />;
}
