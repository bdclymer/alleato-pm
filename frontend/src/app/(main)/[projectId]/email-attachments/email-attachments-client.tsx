"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Mail, Paperclip } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageContainer,
  ProjectPageHeader,
  SectionRuleHeading,
} from "@/components/layout";
import { apiFetch } from "@/lib/api-client";

interface EmailAttachment {
  id: number;
  emailId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string | null;
  textLength: number;
  graphAttachmentId: string | null;
  checksumSha256: string | null;
  email: {
    id: number;
    subject: string;
    fromName: string | null;
    fromEmail: string | null;
    receivedAt: string | null;
    sentAt: string | null;
    createdAt: string | null;
  } | null;
}

interface EmailAttachmentsClientProps {
  projectId: number;
}

function formatBytes(value: number | null): string {
  if (!value) return "Unknown";

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function senderLabel(attachment: EmailAttachment): string {
  const senderName = attachment.email?.fromName?.trim();
  const senderEmail = attachment.email?.fromEmail?.trim();

  if (senderName && senderEmail) return `${senderName} <${senderEmail}>`;
  if (senderName) return senderName;
  if (senderEmail) return senderEmail;
  return "Unknown sender";
}

export function EmailAttachmentsClient({
  projectId,
}: EmailAttachmentsClientProps): React.ReactElement {
  const {
    data: attachments = [],
    isLoading,
    error,
  } = useQuery<EmailAttachment[]>({
    queryKey: ["email-attachments", projectId],
    queryFn: ({ signal }) =>
      apiFetch<EmailAttachment[]>(
        `/api/projects/${projectId}/email-attachments`,
        { signal },
      ),
    enabled: Number.isInteger(projectId),
  });

  return (
    <>
      <ProjectPageHeader
        title="Email Attachments"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${projectId}/emails`}>
              <Mail />
              Emails
            </Link>
          </Button>
        }
      />

      <PageContainer className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <SectionRuleHeading
                label="Files from synced Outlook messages"
                className="mb-0 pb-0"
              />
              <p className="text-sm text-muted-foreground">
                Pulled from email_attachments and linked back to project_emails.
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              {attachments.length} attachment{attachments.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Sender</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Loading attachments...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-destructive">
                      Failed to load email attachments.
                    </TableCell>
                  </TableRow>
                ) : attachments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No synced Outlook attachments are stored for this project yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  attachments.map((attachment) => (
                    <TableRow key={attachment.id}>
                      <TableCell className="max-w-[320px]">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate font-medium text-foreground">
                            {attachment.fileName}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {attachment.contentType || "Unknown type"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="truncate">
                          {attachment.email?.subject || "No subject"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        {senderLabel(attachment)}
                      </TableCell>
                      <TableCell>
                        {formatDate(
                          attachment.email?.receivedAt ||
                            attachment.email?.sentAt ||
                            attachment.createdAt,
                        )}
                      </TableCell>
                      <TableCell>{formatBytes(attachment.fileSize)}</TableCell>
                      <TableCell>
                        {attachment.textLength > 0
                          ? `${attachment.textLength.toLocaleString()} chars`
                          : "No text"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon-sm" asChild>
                          <a
                            href={`/api/projects/${projectId}/email-attachments/${attachment.id}/download`}
                            aria-label={`Download ${attachment.fileName}`}
                          >
                            <Download />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </PageContainer>
    </>
  );
}
