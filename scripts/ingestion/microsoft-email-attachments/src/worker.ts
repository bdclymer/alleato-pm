import { writeToDLQ } from "./db/deadLetter";
import { insertEmailAttachment } from "./db/emailAttachments";
import { assertRequiredSchema, closePool } from "./db/pool";
import { insertProjectEmail } from "./db/projectEmails";
import { resolveProjectSync } from "./db/projectsSync";
import { insertSearchDocument } from "./db/searchDocuments";
import { fetchAttachments, fetchMessage, fetchMessages } from "./graph/messages";
import { generateEmbedding } from "./processing/embeddings";
import { attachmentBytesFromBase64, extractText } from "./processing/textExtract";
import { withRetry } from "./util/retry";

interface Payload {
  userId: string;
  messageId: string;
}

export async function processGraphMessage(payload: Payload) {
  try {
    return await withRetry(() => processGraphMessageOnce(payload), {
      attempts: 3,
      shouldRetry: (error) => !(error instanceof NonRetryableIngestionError),
    });
  } catch (error) {
    await writeFailure(payload, error, "processGraphMessage");
    throw error;
  }
}

export async function processMailbox(userId: string, top = 25) {
  await assertRequiredSchema();
  const results = [];
  for (const message of await fetchMessages(userId, top)) {
    try {
      results.push(await processGraphMessageOnce({ userId, messageId: message.id }));
    } catch (error) {
      await writeFailure({ userId, messageId: message.id }, error, "processMailbox");
    }
  }
  return results;
}

async function processGraphMessageOnce(payload: Payload) {
  await assertRequiredSchema();
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
      `No project match found in Graph message ${message.id}; tried PROJ-id, project_number, and project name.`,
    );
  }

  const emailId = await insertProjectEmail({ message, project, mailboxUserId: payload.userId });
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

  const attachmentIds = [];
  for (const attachment of await fetchAttachments(payload.userId, payload.messageId)) {
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

  return { emailId, attachmentIds, projectSyncId: project.id, projectId: project.projectId };
}

async function writeFailure(payload: unknown, error: unknown, stage: string): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await writeToDLQ({ payload, error: message, stage });
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
  if (!userId) throw new Error("Set MICROSOFT_GRAPH_USER_ID or pass mailbox user as first arg.");

  const results = messageId
    ? [await processGraphMessage({ userId, messageId })]
    : await processMailbox(userId, Number(process.env.MICROSOFT_GRAPH_TOP ?? 25));
  console.log(JSON.stringify({ processed: results.length, results }, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    })
    .finally(async () => closePool());
}
