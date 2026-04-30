export function extractText(...parts: Array<string | Buffer | null | undefined>): string {
  return parts
    .map((part) => {
      if (!part) return "";
      const text = Buffer.isBuffer(part) ? part.toString("utf8") : part;
      return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function attachmentBytesFromBase64(contentBytes?: string): Buffer | null {
  return contentBytes ? Buffer.from(contentBytes, "base64") : null;
}
