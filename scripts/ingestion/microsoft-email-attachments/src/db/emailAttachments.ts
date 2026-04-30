import { createHash } from "node:crypto";
import type { GraphAttachment } from "../graph/messages";
import { attachmentBytesFromBase64 } from "../processing/textExtract";
import { getPool } from "./pool";

export async function insertEmailAttachment(input: {
  emailId: number;
  projectSyncId: string;
  attachment: GraphAttachment;
  extractedText: string;
}): Promise<number> {
  const bytes = attachmentBytesFromBase64(input.attachment.contentBytes);
  const checksum = bytes ? createHash("sha256").update(bytes).digest("hex") : null;
  const fileName = input.attachment.name?.trim() || `graph-attachment-${input.attachment.id}`;

  const result = await getPool().query<{ id: string }>(
    `
      insert into email_attachments (
        email_id, project_sync_id, graph_attachment_id, file_name,
        file_url, file_size, content_type, content, extracted_text, checksum_sha256
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      on conflict (email_id, graph_attachment_id) where graph_attachment_id is not null
      do update set
        project_sync_id = excluded.project_sync_id,
        file_name = excluded.file_name,
        file_url = excluded.file_url,
        file_size = excluded.file_size,
        content_type = excluded.content_type,
        content = excluded.content,
        extracted_text = excluded.extracted_text,
        checksum_sha256 = excluded.checksum_sha256
      returning id
    `,
    [
      input.emailId,
      input.projectSyncId,
      input.attachment.id,
      fileName,
      `graph://project-emails/${input.emailId}/attachments/${input.attachment.id}`,
      input.attachment.size ?? bytes?.byteLength ?? null,
      input.attachment.contentType ?? null,
      bytes,
      input.extractedText || null,
      checksum,
    ],
  );

  return Number(result.rows[0].id);
}
