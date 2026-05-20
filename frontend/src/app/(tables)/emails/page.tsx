import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout";
import { requireAdmin } from "@/app/api/admin/intelligence-compiler/_shared";
import { EmailSyncClient } from "./email-sync-client";

export const metadata: Metadata = {
  title: "Emails",
};

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  await requireAdmin("emails-page");

  return (
    <PageShell variant="table" title="Emails">
      <Suspense>
        <EmailSyncClient />
      </Suspense>
    </PageShell>
  );
}
