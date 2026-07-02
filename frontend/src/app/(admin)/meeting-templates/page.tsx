export const dynamic = "force-dynamic";

import { requireAdmin } from "@/app/api/admin/_shared";

import { MeetingTemplatesClient } from "./meeting-templates-client";

export default async function MeetingTemplatesPage() {
  await requireAdmin("meeting-templates-page");

  return <MeetingTemplatesClient />;
}
