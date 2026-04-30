const PROJECT_ID_PATTERN = /\b(?:PROJ|PROJECT)-(\d{1,18})\b/i;

export function extractProjectId(...parts: Array<string | null | undefined>): bigint | null {
  const text = parts.filter(Boolean).join("\n");
  const match = PROJECT_ID_PATTERN.exec(text);
  if (!match) {
    return null;
  }

  return BigInt(match[1]);
}
