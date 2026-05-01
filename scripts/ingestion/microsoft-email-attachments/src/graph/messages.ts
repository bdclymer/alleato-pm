import { GraphHttpError, graphFetch } from "./client";

export interface GraphMessage {
  id: string;
  internetMessageId?: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: { emailAddress?: { name?: string; address?: string } };
  toRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  ccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  bccRecipients?: Array<{ emailAddress?: { name?: string; address?: string } }>;
  sentDateTime?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
}

export interface GraphAttachment {
  id: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentBytes?: string;
}

const MESSAGE_SELECT = [
  "id",
  "internetMessageId",
  "conversationId",
  "subject",
  "bodyPreview",
  "body",
  "from",
  "toRecipients",
  "ccRecipients",
  "bccRecipients",
  "sentDateTime",
  "receivedDateTime",
  "hasAttachments",
].join(",");

const ATTACHMENT_SELECT = ["id", "name", "contentType", "size", "isInline"].join(",");
const FILE_ATTACHMENT_SELECT = [...ATTACHMENT_SELECT.split(","), "contentBytes"].join(",");

export async function fetchMessage(userId: string, messageId: string): Promise<GraphMessage> {
  return graphFetch<GraphMessage>(
    `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}?$select=${MESSAGE_SELECT}`,
  );
}

export async function fetchMessages(userId: string, top: number): Promise<GraphMessage[]> {
  const params = new URLSearchParams({
    $select: MESSAGE_SELECT,
    $top: String(top),
    $orderby: "receivedDateTime desc",
  });
  const page = await graphFetch<{ value: GraphMessage[] }>(
    `/users/${encodeURIComponent(userId)}/messages?${params.toString()}`,
  );
  return (page.value ?? []).slice(0, top);
}

export async function fetchAttachments(userId: string, messageId: string): Promise<GraphAttachment[]> {
  const page = await graphFetch<{ value: GraphAttachment[] }>(
    `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments?$select=${ATTACHMENT_SELECT}`,
  );

  const attachments: GraphAttachment[] = [];
  for (const attachment of page.value ?? []) {
    attachments.push(await fetchAttachment(userId, messageId, attachment.id));
  }
  return attachments;
}

async function fetchAttachment(
  userId: string,
  messageId: string,
  attachmentId: string,
): Promise<GraphAttachment> {
  const basePath = `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
  try {
    return await graphFetch<GraphAttachment>(
      `${basePath}/microsoft.graph.fileAttachment?$select=${FILE_ATTACHMENT_SELECT}`,
    );
  } catch (error) {
    if (error instanceof GraphHttpError && error.status === 400) {
      try {
        return await graphFetch<GraphAttachment>(`${basePath}?$select=${FILE_ATTACHMENT_SELECT}`);
      } catch (selectError) {
        if (selectError instanceof GraphHttpError && selectError.status === 400) {
          // Outlook attachment detail in this tenant rejects selecting contentBytes,
          // but returns contentBytes on the detail resource. This is the only
          // non-$select Graph call in this worker and is required for PDF extraction.
          return graphFetch<GraphAttachment>(basePath);
        }
        throw selectError;
      }
    }
    throw error;
  }
}
