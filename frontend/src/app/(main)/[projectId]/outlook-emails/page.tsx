import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { EmailsClient } from "../emails/emails-client";

export const metadata: Metadata = {
  title: "Outlook Emails",
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectOutlookEmailsPage({ params }: PageProps) {
  const { projectId } = await params;

  return (
    <PageShell
      variant="table"
      title="Outlook Emails"
      showHeader={false}
      contentClassName="pt-0"
    >
      <EmailsClient
        projectId={Number.parseInt(projectId, 10)}
        source="outlook"
      />
    </PageShell>
  );
}
