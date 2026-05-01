import type { Metadata } from "next";
import { EmailAttachmentsClient } from "./email-attachments-client";

export const metadata: Metadata = {
  title: "Email Attachments",
};

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectEmailAttachmentsPage({ params }: PageProps) {
  const { projectId } = await params;

  return <EmailAttachmentsClient projectId={Number.parseInt(projectId, 10)} />;
}
