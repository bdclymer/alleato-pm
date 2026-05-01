export interface DrawingIdentityInput {
  drawingNumber?: string | null;
  title?: string | null;
  fileName?: string | null;
  revisionNumber?: string | null;
}

export interface DrawingDisplayIdentity {
  number: string;
  title: string;
  subtitle: string;
}

function cleanValue(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function cleanFileStem(fileName: string | null | undefined): string {
  return cleanValue(fileName).replace(/\.[^/.]+$/, "");
}

function normalizeForCompare(value: string | null | undefined): string {
  return cleanFileStem(value)
    .replace(/[_\s]+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .trim()
    .toLowerCase();
}

function normalizeDisplayText(value: string): string {
  return value.replace(/_/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeDrawingNumber(value: string): string {
  return normalizeDisplayText(value).replace(/\s*-\s*/g, "-");
}

function splitFilenameFallback(value: string): { number: string; title: string } | null {
  const stem = normalizeDisplayText(cleanFileStem(value));
  if (!stem) return null;

  const leadingCodePatterns = [
    /^([A-Z]{1,4}\s*-\s*\d{1,5}[A-Z]?)\s+(.+)$/i,
    /^(\d{2,4}\s*-\s*\d{1,5}[A-Z]?)\s*(?:-\s*|\s+)(.+)$/i,
    /^(\d{2,4}\.\d{1,5}[A-Z]?)\s+(.+)$/i,
  ];

  for (const pattern of leadingCodePatterns) {
    const match = stem.match(pattern);
    if (match?.[1]) {
      return {
        number: normalizeDrawingNumber(match[1]),
        title: normalizeDisplayText(match[2] ?? ""),
      };
    }
  }

  const trailingCode = stem.match(/^(.+?)\s+-\s+((?:\d+\s*-\s*)+\d+)$/);
  if (trailingCode?.[1] && trailingCode[2]) {
    return {
      number: normalizeDrawingNumber(trailingCode[2]),
      title: normalizeDisplayText(trailingCode[1]),
    };
  }

  return null;
}

export function getDrawingUploadFallbackIdentity(fileName: string): {
  drawingNumber: string;
  title: string;
} {
  const stem = normalizeDisplayText(cleanFileStem(fileName));
  const split = splitFilenameFallback(stem);

  return {
    drawingNumber: split?.number || stem,
    title: split?.title || stem,
  };
}

export function getDrawingDisplayIdentity(input: DrawingIdentityInput): DrawingDisplayIdentity {
  const rawNumber = cleanValue(input.drawingNumber);
  const rawTitle = cleanValue(input.title);
  const rawFileStem = cleanFileStem(input.fileName);
  const numberMatchesTitle =
    rawNumber !== "" &&
    rawTitle !== "" &&
    normalizeForCompare(rawNumber) === normalizeForCompare(rawTitle);
  const numberMatchesFileName =
    rawNumber !== "" &&
    rawFileStem !== "" &&
    normalizeForCompare(rawNumber) === normalizeForCompare(rawFileStem);

  const fallbackSplit =
    numberMatchesTitle || numberMatchesFileName
      ? splitFilenameFallback(rawNumber || rawTitle || rawFileStem)
      : null;
  const number = fallbackSplit?.number || rawNumber;
  const title = fallbackSplit?.title || rawTitle;
  const titleIsDuplicate =
    title !== "" && number !== "" && normalizeForCompare(title) === normalizeForCompare(number);
  const subtitleParts = [
    title && !titleIsDuplicate ? title : "",
    input.revisionNumber ? `Rev ${input.revisionNumber}` : "",
  ].filter(Boolean);

  return {
    number,
    title: titleIsDuplicate ? "" : title,
    subtitle: subtitleParts.join(" · "),
  };
}
