import { GraphHttpError, graphFetch } from "./client";

export interface GraphEmailAddress {
  name?: string;
  address?: string;
}

export interface GraphRecipient {
  emailAddress?: GraphEmailAddress;
}

export interface GraphMessage {
  id: string;
  internetMessageId?: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    contentType?: "html" | "text";
    content?: string;
  };
  from?: {
    emailAddress?: GraphEmailAddress;
  };
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
  sentDateTime?: string;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  webLink?: string;
}

export interface GraphAttachment {
  id: string;
  "@odata.type"?: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentId?: string;
  contentBytes?: string;
}

interface GraphCollection<T> {
  value: T[];
  "@odata.nextLink"?: string;
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
  "webLink",
].join(",");

const ATTACHMENT_SELECT = [
  "id",
  "name",
  "contentType",
  "size",
  "isInline",
].join(",");

const ATTACHMENT_DETAIL_SELECT = [
  "id",
  "name",
  "contentType",
  "size",
  "isInline",
  "contentBytes",
].join(",");

export async function fetchMessage(userId: string, messageId: string): Promise<GraphMessage> {
  return graphFetch<GraphMessage>(
    `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}?$select=${MESSAGE_SELECT}`,
  );
}

export async function fetchMessages(
  userId: string,
  options: { top?: number; filter?: string } = {},
): Promise<GraphMessage[]> {
  const limit = options.top ?? 25;
  const params = new URLSearchParams({
    $select: MESSAGE_SELECT,
    $top: String(limit),
    $orderby: "receivedDateTime desc",
  });

  if (options.filter) {
    params.set("$filter", options.filter);
  }

  const messages: GraphMessage[] = [];
  let nextUrl: string | undefined = `/users/${encodeURIComponent(userId)}/messages?${params.toString()}`;

  while (nextUrl) {
    const page = await graphFetch<GraphCollection<GraphMessage>>(nextUrl);
    messages.push(...page.value);
    nextUrl = messages.length >= limit ? undefined : page["@odata.nextLink"];
  }

  return messages.slice(0, limit);
}

export async function fetchAttachments(
  userId: string,
  messageId: string,
): Promise<GraphAttachment[]> {
  const attachments: GraphAttachment[] = [];
  let nextUrl: string | undefined =
    `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments?$select=${ATTACHMENT_SELECT}`;

  while (nextUrl) {
    const page = await graphFetch<GraphCollection<GraphAttachment>>(nextUrl);
    attachments.push(...page.value);
    nextUrl = page["@odata.nextLink"];
  }

  const hydratedAttachments: GraphAttachment[] = [];
  for (const attachment of attachments) {
    hydratedAttachments.push(await fetchAttachment(userId, messageId, attachment.id));
  }

  return hydratedAttachments;
}

async function fetchAttachment(
  userId: string,
  messageId: string,
  attachmentId: string,
): Promise<GraphAttachment> {
  try {
    return await graphFetch<GraphAttachment>(
      `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}/microsoft.graph.fileAttachment?$select=${ATTACHMENT_DETAIL_SELECT}`,
    );
  } catch (error) {
    if (error instanceof GraphHttpError && error.status === 400) {
      return graphFetch<GraphAttachment>(
        `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}?$select=${ATTACHMENT_SELECT}`,
      );
    }
    throw error;
  }
}
