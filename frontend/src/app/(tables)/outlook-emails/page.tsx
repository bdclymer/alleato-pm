import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { EmailsClient } from "@/app/(main)/[projectId]/emails/emails-client";

export const metadata: Metadata = {
  title: "Outlook Emails",
};

export default function OutlookEmailsPage() {
  return (
    <PageShell
      variant="table"
      title="Outlook Emails"
      showHeader={false}
      contentClassName="pt-0"
    >
      <EmailsClient scope="global" source="outlook" />
    </PageShell>
  );
}
