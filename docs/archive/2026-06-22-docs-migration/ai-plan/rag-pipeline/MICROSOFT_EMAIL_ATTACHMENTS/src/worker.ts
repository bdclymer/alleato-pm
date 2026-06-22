import { insertEmailAttachment } from "./db/emailAttachments";
import { writeToDLQ } from "./db/deadLetter";
import { closePool, assertRequiredTables } from "./db/pool";
import { insertProjectEmail } from "./db/projectEmails";
import { resolveProjectSync } from "./db/projectsSync";
import { insertSearchDocument } from "./db/searchDocuments";
import { fetchAttachments, fetchMessage, fetchMessages } from "./graph/messages";
import { generateEmbedding } from "./processing/embeddings";
import { attachmentBytesFromBase64, extractText } from "./processing/textExtract";
import { withRetry } from "./util/retry";

export interface ProcessGraphMessagePayload {
  userId: string;
  messageId: string;
}

export interface ProcessGraphMessageResult {
  emailId: number;
  attachmentIds: number[];
  projectSyncId: string;
}

export async function processGraphMessage(
  payload: ProcessGraphMessagePayload,
): Promise<ProcessGraphMessageResult> {
  try {
    return await withRetry(() => processGraphMessageOnce(payload), {
      attempts: 3,
      initialDelayMs: 1_000,
      maxDelayMs: 10_000,
      shouldRetry: (error) => !(error instanceof NonRetryableIngestionError),
    });
  } catch (error) {
    await writeFailure(payload, error, "processGraphMessage");
    throw error;
  }
}

export async function processMailbox(
  userId: string,
  options: { top?: number; filter?: string } = {},
): Promise<ProcessGraphMessageResult[]> {
  await assertRequiredTables();
  const messages = await fetchMessages(userId, options);
  const results: ProcessGraphMessageResult[] = [];

  for (const message of messages) {
    try {
      results.push(await processGraphMessageOnce({ userId, messageId: message.id }));
    } catch (error) {
      await writeFailure({ userId, messageId: message.id }, error, "processMailbox");
    }
  }

  return results;
}

async function processGraphMessageOnce(
  payload: ProcessGraphMessagePayload,
): Promise<ProcessGraphMessageResult> {
  await assertRequiredTables();

  const message = await fetchMessage(payload.userId, payload.messageId);
  const project = await resolveProjectSync(
    message.subject,
    message.bodyPreview,
    message.body?.content,
    message.from?.emailAddress?.name,
    message.from?.emailAddress?.address,
    ...(message.toRecipients ?? []).map((recipient) => recipient.emailAddress?.address),
    ...(message.ccRecipients ?? []).map((recipient) => recipient.emailAddress?.address),
  );

  if (!project) {
    throw new NonRetryableIngestionError(
      `No project match found in Graph message ${message.id}. Tried PROJ-id, project_number, and project name.`,
    );
  }

  const emailId = await insertProjectEmail({
    message,
    project,
    mailboxUserId: payload.userId,
  });
  const emailText = extractText(message.subject, message.bodyPreview, message.body?.content);

  if (emailText) {
    await insertSearchDocument({
      projectSyncId: project.id,
      sourceType: "email",
      sourceId: emailId,
      content: emailText,
      embedding: await generateEmbedding(emailText),
    });
  }

  const attachmentIds: number[] = [];
  const attachments = await fetchAttachments(payload.userId, payload.messageId);

  for (const attachment of attachments) {
    const bytes = attachmentBytesFromBase64(attachment.contentBytes);
    const attachmentText = extractText(attachment.name, bytes);
    const attachmentId = await insertEmailAttachment({
      emailId,
      projectSyncId: project.id,
      attachment,
      extractedText: attachmentText,
    });

    attachmentIds.push(attachmentId);

    if (attachmentText) {
      await insertSearchDocument({
        projectSyncId: project.id,
        sourceType: "attachment",
        sourceId: attachmentId,
        content: attachmentText,
        embedding: await generateEmbedding(attachmentText),
      });
    }
  }

  return {
    emailId,
    attachmentIds,
    projectSyncId: project.id,
  };
}

async function writeFailure(payload: unknown, error: unknown, stage: string): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    await writeToDLQ({ payload, error: message, stage });
  } catch (dlqError) {
    const dlqMessage = dlqError instanceof Error ? dlqError.message : String(dlqError);
    throw new Error(`Ingestion failed (${message}) and DLQ write failed (${dlqMessage}).`);
  }
}

class NonRetryableIngestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableIngestionError";
  }
}

async function main(): Promise<void> {
  const userId = process.env.MICROSOFT_GRAPH_USER_ID ?? process.argv[2];
  const messageId = process.env.MICROSOFT_GRAPH_MESSAGE_ID ?? process.argv[3];

  if (!userId) {
    throw new Error(
      "Missing mailbox user. Set MICROSOFT_GRAPH_USER_ID or pass it as the first argument.",
    );
  }

  if (messageId) {
    const result = await processGraphMessage({ userId, messageId });
    console.log(JSON.stringify({ processed: 1, results: [result] }, null, 2));
    return;
  }

  const top = Number(process.env.MICROSOFT_GRAPH_TOP ?? 25);
  const filter = process.env.MICROSOFT_GRAPH_FILTER;
  const results = await processMailbox(userId, { top, filter });
  console.log(JSON.stringify({ processed: results.length, results }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(async () => {
      await closePool();
    });
}
