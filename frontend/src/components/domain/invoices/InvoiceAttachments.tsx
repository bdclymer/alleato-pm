"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AttachmentUploadPanel, type AttachmentUploadItem } from "@/components/ds/attachment-upload-panel";
import { apiFetch } from "@/lib/api-client";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface InvoiceAttachment {
  id: number;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
  downloadUrl: string | null;
}

interface InvoiceAttachmentsProps {
  projectId: number;
  invoiceId: number;
}

export function InvoiceAttachments({ projectId, invoiceId }: InvoiceAttachmentsProps) {
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const basePath = `/api/projects/${projectId}/invoicing/owner/${invoiceId}/attachments`;

  const fetchAttachments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await apiFetch<{ data: InvoiceAttachment[] }>(basePath);
      setAttachments(result.data ?? []);
    } catch {
      // Non-critical — show empty state rather than error
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    void fetchAttachments();
  }, [fetchAttachments]);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    await apiFetch(basePath, { method: "POST", body: formData });
    await fetchAttachments();
  };

  const handleRemove = async (attachmentId: string) => {
    try {
      await apiFetch(`${basePath}/${attachmentId}`, { method: "DELETE" });
      setAttachments((prev) => prev.filter((a) => String(a.id) !== attachmentId));
      toast.success("Attachment removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove attachment");
    }
  };

  const files: AttachmentUploadItem[] = attachments.map((a) => ({
    id: String(a.id),
    name: a.fileName,
    sizeBytes: a.fileSize,
    uploadedAtLabel: a.createdAt
      ? new Date(a.createdAt).toLocaleDateString()
      : null,
    downloadUrl: a.downloadUrl ?? undefined,
  }));

  if (isLoading) {
    return null;
  }

  return (
    <section>
      <SectionRuleHeading label="Payment Confirmation & Attachments" />

      <AttachmentUploadPanel
        files={files}
        onUploadFile={handleUpload}
        onRemoveFile={handleRemove}
        title="Upload payment confirmation or supporting documents"
        description="Attach the confirmation from the owner's payment processing system or any other supporting files for this pay application."
        emptyTitle="No attachments yet"
        emptyDescription="Upload the payment confirmation once the accounting team has entered this pay application into the owner's system."
      />
    </section>
  );
}
