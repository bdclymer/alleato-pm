/**
 * Normalize numbered meeting/action summaries into a clearer layout:
 * "1. **Meeting Name** - details" => "### 1. Meeting Name\n\ndetails"
 */
function normalizeRetrievedSnippetLine(line: string): string {
  const indentationMatch = line.match(/^\s+/);
  if (!indentationMatch) return line;

  const trimmed = line.trim();
  if (!trimmed.startsWith("#")) return line;

  return `${indentationMatch[0]}${trimmed.replace(/^#{1,6}\s+/, "")}`;
}

export function formatStructuredMeetingList(text: string): string {
  if (!text.includes("\n") || !text.includes("1.")) return text;

  const lines = text.split("\n");
  const linePattern =
    /^(\d+)\.\s*(?:\*\*([^*]+)\*\*|([^—–:\-]+))\s*[—–:\-]\s*(.+)$/;

  const matches = lines
    .map((line, index) => ({ line, index, match: line.match(linePattern) }))
    .filter((item) => item.match);

  // Only transform when this really looks like a meeting/results list.
  if (matches.length < 2) return text;

  return lines
    .map((line) => {
      const match = line.match(linePattern);
      if (!match) return normalizeRetrievedSnippetLine(line);
      const num = match[1];
      const title = (match[2] ?? match[3] ?? "").trim();
      const description = match[4].trim();
      return `### ${num}. ${title}\n\n${description}`;
    })
    .join("\n\n");
}
