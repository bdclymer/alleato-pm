/* eslint-disable design-system/require-page-shell -- UnifiedTablePage provides its own page layout */
import type { Metadata } from "next";
import { EmailsClient } from "./emails-client";

export const metadata: Metadata = {
  title: "Emails",
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectEmailsPage({ params }: PageProps) {
  const { projectId } = await params;

  return <EmailsClient projectId={parseInt(projectId, 10)} />;
}
