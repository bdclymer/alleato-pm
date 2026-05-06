import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout";
import { EmailSyncClient } from "./email-sync-client";

export const metadata: Metadata = {
  title: "Emails",
};

export default function EmailsPage() {
  return (
    <PageShell variant="table" title="Emails" showHeader={false} contentClassName="pt-0">
      <Suspense>
        <EmailSyncClient />
      </Suspense>
    </PageShell>
  );
}
