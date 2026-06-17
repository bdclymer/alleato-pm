// Pure helpers for reducing a stored email thread to its latest message.
//
// project_emails.body_text stores the ENTIRE reply chain inline: the new
// message, its signature, then "From: … Sent: … To: … Subject: …" quote
// headers and every prior message, separated only by those headers (no blank
// lines). Rendering that wall surfaces older messages' signatures under the
// real sender's, which reads as a contradiction (e.g. a mail "From: Brandon
// Clymer" ending in "regards, Bob Wright"). These helpers cut the thread down
// to just the latest message.

// Markers that begin a quoted reply chain underneath the latest message.
export const QUOTED_HISTORY_MARKERS: RegExp[] = [
  // Outlook inline quote header: "From: X <e> Sent: <date> To: ... Subject: ..."
  // The From:…Sent: run is on one line (the stored thread uses non-breaking
  // spaces, not newlines), so we disallow newlines to avoid bridging across a
  // leading multi-line metadata block.
  /From:[^\n]{0,220}?\bSent:\s/i,
  // "-----Original Message-----"
  /-{2,}\s*Original Message\s*-{2,}/i,
  // Gmail-style "On <date> <person> wrote:"
  /\bOn\b[^\n]{0,160}?\bwrote:/i,
  // External-sender banner tokens some tenants inject mid-thread
  /NkdkJdXPPEBannerStart/,
];

export function stripQuotedReplyHistory(value: string): string {
  let cut = value.length;
  for (const marker of QUOTED_HISTORY_MARKERS) {
    const match = marker.exec(value);
    if (match && match.index < cut) cut = match.index;
  }
  return cut < value.length ? value.slice(0, cut).trim() : value;
}

// Some senders prepend a pseudo-header block (Subject:/Date:/From:/To:) that
// duplicates the metadata already shown in the sheet header. Drop that leading
// run so the body opens on the actual message.
const LEADING_PSEUDO_HEADER_RE =
  /^\s*(subject|date|sent|from|to|cc|bcc|reply-to)\s*:/i;

export function stripLeadingPseudoHeader(value: string): string {
  const lines = value.split(/\r?\n/);
  let start = 0;
  let sawHeader = false;
  while (start < lines.length) {
    const line = lines[start];
    if (LEADING_PSEUDO_HEADER_RE.test(line)) {
      sawHeader = true;
      start += 1;
      continue;
    }
    if (sawHeader && line.trim() === "") {
      start += 1;
      continue;
    }
    break;
  }
  return lines.slice(start).join("\n");
}

// Reduce a raw stored body to just the latest message.
export function latestMessageOnly(rawBody: string): string {
  return stripQuotedReplyHistory(stripLeadingPseudoHeader(rawBody));
}
