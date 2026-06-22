export function extractText(...parts: Array<string | Buffer | null | undefined>): string {
  return parts
    .map((part) => normalizePart(part))
    .filter(Boolean)
    .join("\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function attachmentBytesFromBase64(contentBytes?: string): Buffer | null {
  if (!contentBytes) {
    return null;
  }
  return Buffer.from(contentBytes, "base64");
}

function normalizePart(part: string | Buffer | null | undefined): string {
  if (!part) {
    return "";
  }

  const text = Buffer.isBuffer(part) ? part.toString("utf8") : part;
  return stripHtml(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}
