import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout";
import { EmailInboxClient } from "./email-inbox-client";

export const metadata: Metadata = { title: "Email Inbox" };
export const dynamic = "force-dynamic";

export default function EmailInboxPage() {
  return (
    <PageShell variant="table" title="Email Inbox">
      <Suspense>
        <EmailInboxClient />
      </Suspense>
    </PageShell>
  );
}
