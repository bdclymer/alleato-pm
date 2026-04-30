import type { GraphMessage, GraphRecipient } from "../graph/messages";
import { extractText } from "../processing/textExtract";
import { getPool } from "./pool";
import type { ProjectSyncRecord } from "./projectsSync";

export interface InsertProjectEmailInput {
  message: GraphMessage;
  project: ProjectSyncRecord;
  mailboxUserId: string;
}

export async function insertProjectEmail(input: InsertProjectEmailInput): Promise<number> {
  const message = input.message;
  const subject = message.subject?.trim() || "(no subject)";
  const bodyHtml = message.body?.contentType === "html" ? message.body.content ?? null : null;
  const bodyText =
    message.body?.contentType === "text"
      ? message.body.content ?? null
      : extractText(message.bodyPreview, message.body?.content);

  const result = await getPool().query<{ id: string }>(
    `
      insert into project_emails (
        project_id,
        project_sync_id,
        graph_message_id,
        mailbox_user_id,
        conversation_id,
        subject,
        body,
        body_html,
        body_text,
        from_name,
        from_email,
        to_list,
        cc_list,
        bcc_list,
        status,
        sent_at,
        received_at,
        has_attachments,
        thread_id
      )
      values (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19
      )
      on conflict (graph_message_id) where graph_message_id is not null
      do update set
        project_id = excluded.project_id,
        project_sync_id = excluded.project_sync_id,
        mailbox_user_id = excluded.mailbox_user_id,
        conversation_id = excluded.conversation_id,
        subject = excluded.subject,
        body = excluded.body,
        body_html = excluded.body_html,
        body_text = excluded.body_text,
        from_name = excluded.from_name,
        from_email = excluded.from_email,
        to_list = excluded.to_list,
        cc_list = excluded.cc_list,
        bcc_list = excluded.bcc_list,
        sent_at = excluded.sent_at,
        received_at = excluded.received_at,
        has_attachments = excluded.has_attachments,
        thread_id = excluded.thread_id,
        updated_at = now()
      returning id
    `,
    [
      input.project.projectId,
      input.project.id,
      message.id,
      input.mailboxUserId,
      message.conversationId ?? null,
      subject,
      bodyText,
      bodyHtml,
      bodyText,
      message.from?.emailAddress?.name ?? null,
      message.from?.emailAddress?.address ?? null,
      recipientsToArray(message.toRecipients),
      recipientsToArray(message.ccRecipients),
      recipientsToArray(message.bccRecipients),
      "Received",
      message.sentDateTime ?? null,
      message.receivedDateTime ?? null,
      Boolean(message.hasAttachments),
      message.conversationId ?? message.internetMessageId ?? null,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Unable to insert or reselect project email for Graph message ${message.id}.`);
  }

  return Number(row.id);
}

function recipientsToArray(recipients: GraphRecipient[] | undefined): string[] {
  return (recipients ?? [])
    .map((recipient) => recipient.emailAddress?.address ?? recipient.emailAddress?.name)
    .filter((value): value is string => Boolean(value));
}
