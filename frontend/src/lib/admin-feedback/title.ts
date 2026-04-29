const REQUEST_TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  change_request: "Change Events",
  copy: "Copy",
  question: "Question",
};

function compactText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function typeLabel(requestType: string) {
  return REQUEST_TYPE_LABELS[requestType] ?? requestType.charAt(0).toUpperCase() + requestType.slice(1);
}

export function buildAdminFeedbackTitle({
  providedTitle,
  requestType,
  comment,
  targetText,
  pageTitle,
}: {
  providedTitle?: string | null;
  requestType: string;
  comment: string;
  targetText?: string | null;
  pageTitle?: string | null;
}) {
  const explicitTitle = compactText(providedTitle);
  if (explicitTitle) {
    return truncate(explicitTitle, 200);
  }

  const commentSummary = compactText(comment);
  if (commentSummary) {
    return truncate(commentSummary, 160);
  }

  const fallback = compactText(targetText) || compactText(pageTitle) || "page element";
  return truncate(`${typeLabel(requestType)}: ${fallback}`, 160);
}

export function displayAdminFeedbackTitle({
  storedTitle,
  requestType,
  comment,
  targetText,
  pageTitle,
}: {
  storedTitle: string;
  requestType: string;
  comment: string;
  targetText?: string | null;
  pageTitle?: string | null;
}) {
  const normalizedStoredTitle = compactText(storedTitle);
  const legacyTargetTitle = `${typeLabel(requestType)}: ${compactText(targetText)}`;

  if (
    normalizedStoredTitle &&
    legacyTargetTitle.trim() !== `${typeLabel(requestType)}:` &&
    legacyTargetTitle.startsWith(normalizedStoredTitle)
  ) {
    return buildAdminFeedbackTitle({
      requestType,
      comment,
      targetText,
      pageTitle,
    });
  }

  return normalizedStoredTitle || buildAdminFeedbackTitle({
    requestType,
    comment,
    targetText,
    pageTitle,
  });
}
