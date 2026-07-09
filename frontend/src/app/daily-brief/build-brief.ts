// Builds the Daily Executive Brief body HTML from the REAL executive-brief
// packet (daily_recaps → briefing_packet), the same data that powers /executive.
//
// Every rendered claim carries a `.src` link that resolves to its actual source:
//   - citation.sourceUrl (Fireflies transcript / Outlook web link / document URL), or
//   - the in-app meeting page (/{projectId}/meetings/{id}) when the source is a
//     meeting with an id but no external URL.
// When neither exists, the source renders muted and non-interactive — we never
// fabricate a link.
//
// This is a pure string builder (no DOM, no data access) so it is trivially
// unit-testable and safe to run at request time inside a server component. All
// interpolated values are HTML-escaped.

import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  BriefCitation,
  ExecutiveOperatingBrief,
  ExecutiveOperatingBriefFocusItem,
  ExecutiveOperatingBriefRiskItem,
} from "@/lib/executive/brandon-daily-update";

export type BriefMeeting = {
  id: string;
  title: string;
  date: string | null;
  project: string | null;
  projectId: number | null;
  /** Real link to the meeting — external transcript URL or in-app meeting page. */
  href: string | null;
};

/** One event on the week strip — a meeting transcript or a dated deadline. */
export type BriefCalendarEvent = {
  title: string;
  time: string | null;
  href: string | null;
  kind: "meeting" | "due";
};

/** One column of the calendar week strip. */
export type BriefCalendarDay = {
  /** Eastern YYYY-MM-DD key for the day. */
  dateKey: string;
  /** Short weekday label, e.g. "Mon". */
  dow: string;
  /** Day-of-month number, e.g. "8". */
  dayNum: string;
  isToday: boolean;
  isWeekend: boolean;
  events: BriefCalendarEvent[];
};

/**
 * An item that was open in yesterday's packet and is still unresolved today — so
 * nothing pending silently drops off the radar between briefs.
 */
export type BriefCarryoverItem = {
  /** Stable key matching the same item's feedback subject id. */
  key: string;
  title: string;
  project: string | null;
  summary: string;
  /** How many days this has been carried, ≥1. */
  ageDays: number;
  citation: {
    source: BrandonBriefItem["source"];
    sourceDetail?: string;
    sourceUrl?: string;
    sourceId?: string;
    date?: string;
  } | null;
  projectInternalId: number | null;
};

export type BuildBriefInput = {
  packet: BrandonDailyUpdatePacket;
  operatingBrief: ExecutiveOperatingBrief;
  meetings: BriefMeeting[];
  /** Current-week strip (Mon–Sun), computed in the page from real meeting data. */
  calendar?: BriefCalendarDay[];
  /** Still-open items carried over from yesterday's packet. */
  carryover?: BriefCarryoverItem[];
};

const LANE_LABELS: Record<string, string> = {
  cashMargin: "Cash / Margin",
  scheduleField: "Schedule / Field",
  customerOwner: "Customer / Owner",
  subcontractorVendor: "Subcontractor / Vendor",
  designPreconstruction: "Design / Preconstruction",
  internalAccountability: "Internal Accountability",
};

// ── escaping ──────────────────────────────────────────────────────────────────

function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
      character,
  );
}

function escAttr(value: unknown): string {
  return esc(value).replace(/'/g, "&#39;");
}

// ── formatting ──────────────────────────────────────────────────────────────────

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // A date-only string (YYYY-MM-DD) parses as UTC midnight; formatting it in
  // Eastern time would shift it back a day. Anchor it to noon UTC so it stays
  // on the same calendar day in any US timezone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const isoDate = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // Packet citations store dates as human strings like "Jul 8, 2026" (no time).
  // Those parse as midnight in the SERVER's timezone, so formatting them in
  // Eastern time shifts them back a calendar day on a UTC host (Vercel) — the
  // brief showed "Jul 7" for genuine Jul 8 sources. Re-anchor any value with no
  // time-of-day component to noon UTC on its own calendar day so it is stable
  // in every timezone. Values that DO carry a time (ISO datetimes) pass through
  // untouched so fmtTime keeps working.
  const hasTimeComponent = /\d{1,2}:\d{2}/.test(value) || /T\d{2}/.test(value);
  if (!hasTimeComponent) {
    return new Date(
      Date.UTC(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        12,
      ),
    );
  }
  return parsed;
}

function fmtShortDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function fmtWeekday(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  }).format(date);
}

function fmtLongDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function fmtTime(value: string | null | undefined): string {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(date);
}

function money(value: number | null | undefined): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}K`;
  return `${sign}$${Math.round(abs)}`;
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// ── source links (the whole point of the "for real" version) ────────────────────

type CitationLike = {
  source: BrandonBriefItem["source"];
  sourceDetail?: string;
  sourceUrl?: string;
  sourceId?: string;
  date?: string;
};

function resolveHref(
  citation: CitationLike,
  projectInternalId: number | null | undefined,
): string | null {
  if (citation.sourceUrl && /^https?:\/\//i.test(citation.sourceUrl)) {
    return citation.sourceUrl;
  }
  // A meeting/transcript with an id but no external link → in-app meeting page.
  // Encode the id: it comes from upstream document metadata and could contain a
  // reserved path character.
  if (citation.sourceId && /meeting|transcript/i.test(String(citation.source))) {
    const id = encodeURIComponent(citation.sourceId);
    return projectInternalId ? `/${projectInternalId}/meetings/${id}` : `/meetings/${id}`;
  }
  return null;
}

function citationLabel(citation: CitationLike): string {
  const detail = citation.sourceDetail
    ? truncate(citation.sourceDetail, 48)
    : String(citation.source);
  const date = fmtShortDate(citation.date);
  return date ? `${detail} · ${date}` : detail;
}

function srcHtml(
  citation: CitationLike,
  projectInternalId: number | null | undefined,
): string {
  const label = esc(citationLabel(citation));
  const href = resolveHref(citation, projectInternalId);
  const typeAttr = ` data-type="${escAttr(citation.source)}"`;
  if (!href) {
    return `<span class="src src--plain"${typeAttr}>${label}</span>`;
  }
  const external = /^https?:\/\//i.test(href);
  const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  return `<a class="src" href="${escAttr(href)}"${rel}${typeAttr}>${label}</a>`;
}

function dedupeCitations(citations: BriefCitation[]): BriefCitation[] {
  const seen = new Set<string>();
  const out: BriefCitation[] = [];
  for (const citation of citations) {
    const key = (
      citation.sourceUrl ||
      citation.sourceId ||
      `${citation.source}:${citation.sourceDetail}`
    ).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(citation);
  }
  return out;
}

function itemSourcesHtml(item: BrandonBriefItem, max = 3): string {
  const citations = dedupeCitations(
    item.citations?.length
      ? item.citations
      : [
          {
            source: item.source,
            sourceDetail: item.sourceDetail,
            sourceUrl: item.sourceUrl,
            sourceId: item.sourceId,
            date: item.date,
          },
        ],
  ).slice(0, max);
  if (citations.length === 0) return "";
  const links = citations
    .map((citation) => srcHtml(citation, item.projectInternalId))
    .join("");
  return `<div class="src-row">${links}</div>`;
}

// ── stable item keys + feedback affordance ──────────────────────────────────────

/**
 * A deterministic, render-stable key for a brief item so (a) the same item can be
 * matched across yesterday/today for carryover, and (b) feedback written to the
 * learning loop points at a consistent subject. Derived from the item's identity
 * (project + title, plus source id when present), NOT its position.
 */
function hashKey(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }
  // >>> 0 → unsigned; base36 keeps it short and url/attr safe.
  return (hash >>> 0).toString(36);
}

export function itemKey(
  item: Pick<
    BrandonBriefItem,
    "title" | "project" | "projectInternalId" | "sourceId"
  >,
): string {
  const identity = [
    item.projectInternalId ?? (item.project || "").trim().toLowerCase(),
    (item.title || "").trim().toLowerCase(),
    item.sourceId || "",
  ].join("|");
  return hashKey(identity);
}

/**
 * The quiet per-item feedback control. Renders a single low-contrast trigger that
 * opens an accurate / inaccurate / done menu. All the data the client POST needs
 * (subject id + a minimal snapshot) rides on data-* attributes so the document
 * stays a pure string with no per-item inline handlers.
 */
function fbHtml(
  subjectId: string,
  snapshot: { title: string; project?: string | null },
): string {
  const title = escAttr(truncate(snapshot.title || "", 160));
  const project = escAttr(snapshot.project || "");
  return `<span class="fb" data-fb data-fb-id="${escAttr(subjectId)}" data-fb-title="${title}" data-fb-project="${project}">
    <button type="button" class="fb-trigger" aria-haspopup="true" aria-expanded="false" aria-label="Rate this item for the AI feedback loop">&#8942;</button>
    <span class="fb-menu" role="menu">
      <button type="button" class="fb-btn" role="menuitem" data-signal="positive"><span class="fb-dot"></span> Accurate</button>
      <button type="button" class="fb-btn" role="menuitem" data-signal="negative"><span class="fb-dot"></span> Inaccurate / not true</button>
      <button type="button" class="fb-btn" role="menuitem" data-signal="completed"><span class="fb-dot"></span> Done / resolved</button>
    </span>
  </span>`;
}

// ── severity → badge/pill class ─────────────────────────────────────────────────

function severity(tone: string | null | undefined): "crit" | "amber" | "info" {
  const value = String(tone ?? "").toLowerCase();
  if (/crit|block|risk|urgent|overdue/.test(value)) return "crit";
  if (/watch|warn|pending|amber|delay/.test(value)) return "amber";
  return "info";
}

// ── section builders ────────────────────────────────────────────────────────────

function coverageCounts(packet: BrandonDailyUpdatePacket) {
  const counts = { Meeting: 0, Email: 0, Teams: 0, Document: 0 };
  for (const entry of packet.sourceCoverage ?? []) {
    if (entry.label in counts) {
      counts[entry.label as keyof typeof counts] += entry.count ?? 0;
    }
  }
  const total = (packet.sourceCoverage ?? []).reduce(
    (sum, entry) => sum + (entry.count ?? 0),
    0,
  );
  return { ...counts, total };
}

function buildMasthead(input: BuildBriefInput): string {
  const { packet, operatingBrief } = input;
  const counts = coverageCounts(packet);
  const decisions = packet.sections.needsBrandon.length;
  const waiting = packet.sections.waitingOnOthers.length;
  const thesis = operatingBrief.startHere[0]
    ? esc(operatingBrief.startHere[0])
    : "Today's operating picture across the active portfolio, traced to source.";

  const pills: string[] = [];
  if (decisions > 0) {
    pills.push(
      `<span class="temp-pill" role="listitem"><span class="dot dot--crit"></span> <b>${decisions}</b> owner decision${decisions === 1 ? "" : "s"}</span>`,
    );
  }
  if (waiting > 0) {
    pills.push(
      `<span class="temp-pill" role="listitem"><span class="dot dot--amber"></span> <b>${waiting}</b> waiting on others</span>`,
    );
  }
  if (operatingBrief.hasUnusualExecutiveLoad) {
    pills.push(
      `<span class="temp-pill" role="listitem"><span class="dot dot--crit"></span> heavier executive load today</span>`,
    );
  }
  if (counts.total > 0) {
    pills.push(
      `<span class="temp-pill" role="listitem"><span class="dot dot--pos"></span> <b>${counts.total}</b> sources synthesized</span>`,
    );
  }

  return `
<header class="masthead">
  <div class="masthead__inner">
    <div class="masthead__top">
      <div class="flag">Daily Executive Brief &middot; Prepared for <b>Brandon</b></div>
      <div class="coverage-stamp">
        Source window ${esc(fmtLongDate(packet.generatedAt))}<br />
        <span>${counts.Meeting}</span> meetings &middot; <span>${counts.Email}</span> emails &middot; <span>${counts.Teams}</span> teams &middot; <span>${counts.Document}</span> docs
      </div>
    </div>
    <h1 class="masthead__date">
      <small>${esc(fmtWeekday(packet.generatedAt))}</small>
      ${esc(fmtLongDate(packet.generatedAt))}
    </h1>
    <p class="thesis">${thesis}</p>
    <div class="temp" role="list" aria-label="Today at a glance">
      ${pills.join("\n      ")}
    </div>
  </div>
</header>`;
}

function buildStatStrip(input: BuildBriefInput): string {
  const pulse = input.packet.financialPulse;
  if (!pulse) return "";
  const tiles: string[] = [];
  const push = (
    tag: string,
    tagClass: string,
    figure: string | null,
    label: string,
    note: string,
  ) => {
    if (!figure) return;
    tiles.push(`
        <div class="stat">
          <span class="tag-inline ${tagClass}">${esc(tag)}</span>
          <div class="stat__fig">${esc(figure)}</div>
          <div class="stat__label">${esc(label)}</div>
          <p>${esc(note)}</p>
        </div>`);
  };

  push(
    "AR",
    "ti--info",
    money(pulse.totalOutstandingAR),
    "Outstanding AR",
    "Total open receivables across active jobs.",
  );
  push(
    "Overdue",
    "ti--crit",
    money(pulse.totalOverdueAR),
    "Overdue AR",
    "Past-due balance needing collection focus.",
  );
  push(
    "Pending",
    "ti--amber",
    money(pulse.totalPendingCORevenue),
    "Pending CO revenue",
    "On-hold change-order revenue not yet booked.",
  );
  const topAr = (pulse.arByProject ?? []).find(
    (project) => project.overdueBalance > 0,
  );
  if (topAr) {
    push(
      "Top overdue",
      "ti--crit",
      money(topAr.overdueBalance),
      truncate(topAr.projectName, 22),
      `Largest single overdue balance (${topAr.invoiceCount} invoice${topAr.invoiceCount === 1 ? "" : "s"}).`,
    );
  }

  if (tiles.length === 0) return "";
  return `\n      <div class="stat-strip">${tiles.join("")}\n      </div>`;
}

function buildReadGrid(focus: ExecutiveOperatingBriefFocusItem[]): string {
  const top = focus.slice(0, 3);
  if (top.length === 0) return "";
  const items = top
    .map((entry, index) => {
      const eyebrowClass = index === 0 ? "" : index === 1 ? " amber" : "";
      const label = LANE_LABELS[entry.lane] ?? "Priority";
      const text = entry.whatChanged || realWhy(entry.whyItMatters);
      return `
        <div class="read-item">
          <div class="eyebrow${eyebrowClass}">${esc(label)}</div>
          <p>${esc(truncate(cleanProse(text), 180))}</p>
        </div>`;
    })
    .join("");
  return `\n      <div class="read-grid">${items}\n      </div>`;
}

function buildTodaysRead(input: BuildBriefInput): string {
  const { operatingBrief } = input;
  const lead = operatingBrief.startHere.length
    ? operatingBrief.startHere.map((line) => esc(cleanProse(line))).join(" ")
    : "";
  if (!lead && operatingBrief.topExecutiveFocus.length === 0) return "";
  const leadHtml = lead ? `<p class="lead">${lead}</p>` : "";
  return `
    <section id="read">
      <div class="sec-head"><span class="idx">01</span><h2>Today's read</h2></div>
      ${leadHtml}${buildStatStrip(input)}${buildReadGrid(operatingBrief.topExecutiveFocus)}
    </section>`;
}

// Deep-read candidates carry hardcoded pipeline metadata in `why_it_matters`
// ("Derived from Daily Deep Read section: …") and `next_action` ("Review
// candidate and decide…"). That is bookkeeping, not real content — never surface
// it. The real decision text lives in `summary`.
const PLACEHOLDER_WHY = /^Derived from Daily Deep Read section:/i;
const PLACEHOLDER_ACTIONS = new Set([
  "Review candidate and decide whether to promote into project intelligence.",
  "Review and either assign as a task or reject.",
]);
// Inline source tokens (`S12`, `teamsdm_…`, `outlook_…`, meeting ULIDs) are shown
// as linked sources separately, so strip the raw backtick tokens from prose —
// otherwise they render as literal noise inside the sentence.
// Match a whole backtick-wrapped source token: a short alias (`S12`), a
// channel-prefixed id (`outlook_…`, `teamsdm_…` — these carry base64 chars like
// = / +, so consume to the closing backtick), or a bare meeting ULID.
const SOURCE_TOKEN_RE =
  /`\s*(?:S\d+|(?:teamsdm|teams|outlook|email|meeting|document|doc)_[^`]*|[0-9A-HJKMNP-TV-Z]{20,})\s*`/gi;
export function cleanProse(text: string | null | undefined): string {
  return (text ?? "")
    .replace(SOURCE_TOKEN_RE, "")
    // The deep-read consumer's placeholder prose is woven into derived narrative
    // (the lead + focus lines) as substrings, so strip the phrases too — not just
    // when they are the whole field.
    .replace(/Derived from Daily Deep Read section:[^.]*\.?/gi, "")
    .replace(/Review candidate and decide whether to promote into project intelligence\.?/gi, "")
    .replace(/Review and either assign as a task or reject\.?/gi, "")
    // Collapse brackets/parens left holding only separators after token removal:
    // "(`S1`, `S2`)" → "(, )" → "".
    .replace(/[([{]\s*[,;·|/&\s]*\s*[)\]}]/g, "")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\(\s*[,;]\s*/g, "(")
    .replace(/([:;,])\s*\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s:;,]+$/, "")
    .trim();
}
function realWhy(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  return value && !PLACEHOLDER_WHY.test(value) ? value : "";
}
function realAction(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  return value && !PLACEHOLDER_ACTIONS.has(value) ? value : "";
}

function buildDecisions(input: BuildBriefInput): string {
  const items = input.packet.sections.needsBrandon;
  if (items.length === 0) return "";
  const cards = items
    .map((item) => {
      const sev = severity(item.tone ?? item.status);
      const cardClass =
        sev === "crit" ? " is-critical" : sev === "amber" ? " is-amber" : "";
      const badgeClass =
        sev === "crit" ? "badge--crit" : sev === "amber" ? "badge--amber" : "badge--info";
      const due = esc(item.status || "Needs decision");
      const body = esc(
        truncate(cleanProse(item.summary || realWhy(item.whyItMatters)), 320),
      );
      const action = realAction(item.recommendedAction);
      const step = action
        ? `
          <details class="more">
            <summary><span class="chev">&rsaquo;</span> Recommended next step</summary>
            <div class="more__body">
              <div class="delegate">
                <div class="delegate__label">Suggested next step &mdash; your call</div>
                <div class="delegate__row">
                  <span class="owner-chip">&rarr; ${esc(item.owner || "Owner")}</span>
                  <span class="delegate__action">${esc(cleanProse(action))}</span>
                </div>
              </div>
            </div>
          </details>`
        : "";
      return `
        <article class="decision${cardClass}" data-fb-item>
          <div class="decision__head">
            <div class="decision__ref">${esc(item.project || "Portfolio")}</div>
            <h3>${esc(cleanProse(item.title))}</h3>
            <p>${body}</p>
            ${itemSourcesHtml(item)}
          </div>
          <div class="decision__due">
            <span class="badge ${badgeClass}">${due}</span>
            ${fbHtml(itemKey(item), { title: item.title, project: item.project })}
          </div>
          ${step}
        </article>`;
    })
    .join("");
  return `
    <section id="decisions">
      <div class="sec-head"><span class="idx">02</span><h2>Highest-leverage decisions</h2><span class="count">${items.length} open</span></div>
      <div class="decisions">${cards}</div>
    </section>`;
}

function watchItemHtml(
  item: ExecutiveOperatingBriefRiskItem,
  fallbackSeverity: "crit" | "amber",
): string {
  const brief = item.item;
  const sev = severity(brief.tone ?? brief.status) || fallbackSeverity;
  const wClass = sev === "crit" ? "w--crit" : sev === "amber" ? "w--amber" : "w--info";
  const figClass =
    sev === "crit" ? "fig--crit" : sev === "amber" ? "fig--amber" : "fig--info";
  const fig = esc(truncate(item.impact || brief.status || "", 16));
  const detail = esc(
    truncate(cleanProse(realAction(item.nextAction) || brief.summary || ""), 220),
  );
  return `
          <div class="watch-item ${wClass}" data-fb-item>
            <div class="watch-item__top">
              <h4>${esc(truncate(cleanProse(brief.title), 60))}</h4>
              <span class="watch-item__fig ${figClass}">${fig}${fbHtml(itemKey(brief), { title: brief.title, project: brief.project })}</span>
            </div>
            <p>${detail}</p>
            ${itemSourcesHtml(brief, 1)}
          </div>`;
}

function buildWatch(input: BuildBriefInput): string {
  const { cashAndMarginWatch, projectRiskRadar } = input.operatingBrief;
  if (cashAndMarginWatch.length === 0 && projectRiskRadar.length === 0) return "";
  const financial = cashAndMarginWatch
    .map((item) => watchItemHtml(item, "amber"))
    .join("");
  const schedule = projectRiskRadar
    .map((item) => watchItemHtml(item, "crit"))
    .join("");
  const financialCol = financial
    ? `<div class="watch__col"><h3>Cash &amp; margin</h3>${financial}</div>`
    : "";
  const scheduleCol = schedule
    ? `<div class="watch__col"><h3>Schedule &amp; project risk</h3>${schedule}</div>`
    : "";
  return `
    <section id="watch">
      <div class="sec-head"><span class="idx">03</span><h2>Financial &amp; schedule watch</h2><span class="count">not decisions — moving</span></div>
      <div class="watch">${financialCol}${scheduleCol}</div>
    </section>`;
}

function buildProjects(input: BuildBriefInput): string {
  const { packet } = input;
  type Group = { label: string; projectId: number | null; items: BrandonBriefItem[] };
  const groups = new Map<string, Group>();
  const all = [
    ...packet.sections.needsBrandon,
    ...packet.sections.waitingOnOthers,
    ...packet.sections.importantUpdates,
  ];
  for (const item of all) {
    const label = (item.project || "Internal / cross-project").trim();
    const key = String(item.projectInternalId ?? label.toLowerCase());
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, {
        label,
        projectId: item.projectInternalId ?? null,
        items: [item],
      });
    }
  }
  if (groups.size === 0) return "";

  const decisionKeys = new Set(
    packet.sections.needsBrandon.map((item) =>
      // Must use the SAME fallback as the group key above, or a cross-project
      // decision (no project, no id) never matches its group and loses its badge.
      String(
        item.projectInternalId ??
          (item.project || "Internal / cross-project").trim().toLowerCase(),
      ),
    ),
  );
  const ordered = Array.from(groups.entries()).sort((a, b) => {
    const aHot = decisionKeys.has(a[0]) ? 1 : 0;
    const bHot = decisionKeys.has(b[0]) ? 1 : 0;
    if (aHot !== bHot) return bHot - aHot;
    return b[1].items.length - a[1].items.length;
  });

  const cards = ordered
    .map(([key, group], index) => {
      const hot = decisionKeys.has(key);
      const featured = index === 0;
      const worst = group.items.reduce<"crit" | "amber" | "info">((acc, item) => {
        const sev = severity(item.tone ?? item.status);
        if (acc === "crit" || sev === "crit") return "crit";
        if (acc === "amber" || sev === "amber") return "amber";
        return acc;
      }, "info");
      const pillClass =
        worst === "crit" ? "pill--crit" : worst === "amber" ? "pill--amber" : "pill--info";
      const pillLabel = hot
        ? "Decision open"
        : worst === "crit"
          ? "At risk"
          : worst === "amber"
            ? "Watch"
            : `${group.items.length} update${group.items.length === 1 ? "" : "s"}`;
      const oneline = esc(truncate(cleanProse(group.items[0].summary) || group.items[0].title, 90));
      const nameHtml = group.projectId
        ? `<a href="/${group.projectId}/home" style="color:inherit;text-decoration:none">${esc(group.label)}</a>`
        : esc(group.label);

      const rows = group.items
        .map((item) => {
          return `
              <div class="subsite" data-fb-item>
                <div class="subsite__name">${esc(truncate(item.title, 48))}</div>
                <p>${esc(truncate(cleanProse(item.summary), 200))}${itemSourcesHtml(item, 2)}</p>
                <div class="subsite__status"><span class="pill ${
                  severity(item.tone ?? item.status) === "crit"
                    ? "pill--crit"
                    : severity(item.tone ?? item.status) === "amber"
                      ? "pill--amber"
                      : "pill--info"
                }">${esc(item.owner ? `Owner: ${truncate(item.owner, 18)}` : (item.status || "Update"))}</span>${fbHtml(itemKey(item), { title: item.title, project: item.project })}</div>
              </div>`;
        })
        .join("");

      return `
        <details class="proj${featured ? " proj--feature" : ""}"${featured ? " open" : ""}>
          <summary>
            <div class="proj__name">${nameHtml}${hot ? " <small>Decision open</small>" : ""}</div>
            <div class="proj__oneline">${oneline}</div>
            <span class="pill ${pillClass}">${esc(pillLabel)}</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <div class="subsites">${rows}</div>
          </div>
        </details>`;
    })
    .join("");

  return `
    <section id="projects">
      <div class="sec-head"><span class="idx">05</span><h2>By project</h2><span class="count">${ordered.length} active</span></div>
      <div class="projects">${cards}</div>
    </section>`;
}

function buildMeetings(input: BuildBriefInput): string {
  const meetings = input.meetings.filter((meeting) => meeting.title);
  if (meetings.length === 0) return "";
  const rows = meetings
    .map((meeting) => {
      const time = fmtTime(meeting.date);
      const meta = [time, meeting.project].filter(Boolean).map(esc).join(" · ");
      const titleHtml = meeting.href
        ? `<a href="${escAttr(meeting.href)}"${/^https?:\/\//i.test(meeting.href) ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(meeting.title)}</a>`
        : esc(meeting.title);
      return `
          <div class="meeting-row">
            <div class="meeting-row__title">${titleHtml}</div>
            <div class="meeting-row__meta">${meta}</div>
          </div>`;
    })
    .join("");
  return `
    <section id="meetings">
      <div class="sec-head"><span class="idx">07</span><h2>Today's meetings</h2><span class="count">${meetings.length} · open the transcript</span></div>
      <div class="meetings">${rows}</div>
    </section>`;
}

function buildCalendar(input: BuildBriefInput): string {
  const days = input.calendar ?? [];
  const hasAnyEvent = days.some((day) => day.events.length > 0);
  if (days.length === 0 || !hasAnyEvent) return "";
  const cols = days
    .map((day) => {
      const events = day.events
        .map((event) => {
          const time = event.time
            ? `<span class="cal-event__time">${esc(event.time)}</span>`
            : "";
          const dueClass = event.kind === "due" ? " is-due" : "";
          const label = `${time}${esc(truncate(event.title, 46))}`;
          return event.href
            ? `<a class="cal-event${dueClass}" href="${escAttr(event.href)}"${
                /^https?:\/\//i.test(event.href)
                  ? ' target="_blank" rel="noopener noreferrer"'
                  : ""
              }>${label}</a>`
            : `<span class="cal-event${dueClass}">${label}</span>`;
        })
        .join("");
      const body =
        day.events.length > 0
          ? events
          : `<div class="cal-day__empty">Clear</div>`;
      const dayClass = [
        "cal-day",
        day.isToday ? "is-today" : "",
        day.isWeekend ? "is-weekend" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `
          <div class="${dayClass}">
            <div class="cal-day__head">
              <span class="cal-day__dow">${esc(day.dow)}</span>
              <span class="cal-day__num">${esc(day.dayNum)}</span>
            </div>
            ${body}
          </div>`;
    })
    .join("");
  return `
    <section id="calendar">
      <div class="sec-head"><span class="idx">06</span><h2>This week</h2><span class="count">meetings &amp; deadlines</span></div>
      <div class="cal-strip">${cols}</div>
    </section>`;
}

type ActionRow = {
  key: string;
  text: string;
  owner: string | null;
  citation: CitationLike | null;
  projectInternalId: number | null | undefined;
};

function buildActions(input: BuildBriefInput): string {
  const rows: ActionRow[] = [];
  const seen = new Set<string>();
  const push = (
    baseItem: BrandonBriefItem,
    text: string | undefined | null,
  ) => {
    const clean = cleanProse(text);
    if (!clean) return;
    const dedupeKey = clean.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    rows.push({
      key: `${itemKey(baseItem)}:action`,
      text: clean,
      owner: baseItem.owner || null,
      citation: {
        source: baseItem.source,
        sourceDetail: baseItem.sourceDetail,
        sourceUrl: baseItem.sourceUrl,
        sourceId: baseItem.sourceId,
        date: baseItem.date,
      },
      projectInternalId: baseItem.projectInternalId,
    });
  };

  for (const item of input.packet.sections.needsBrandon) {
    push(item, realAction(item.recommendedAction));
  }
  for (const risk of input.operatingBrief.cashAndMarginWatch) {
    push(risk.item, realAction(risk.nextAction));
  }
  for (const risk of input.operatingBrief.projectRiskRadar) {
    push(risk.item, realAction(risk.nextAction));
  }

  const capped = rows.slice(0, 12);
  if (capped.length === 0) return "";

  const items = capped
    .map((row) => {
      const owner = row.owner
        ? `<div class="action-item__owner">Owner <b>${esc(truncate(row.owner, 24))}</b></div>`
        : "";
      const source = row.citation
        ? `<div class="src-row">${srcHtml(row.citation, row.projectInternalId)}</div>`
        : "";
      return `
          <div class="action-item" data-fb-item>
            <input type="checkbox" class="action-check" data-fb-id="${escAttr(row.key)}" data-fb-title="${escAttr(truncate(row.text, 160))}" aria-label="Mark done — feeds the AI loop" />
            <div class="action-item__body">
              <div class="action-item__text">${esc(row.text)}</div>
              ${owner}${source}
            </div>
            <div class="action-item__meta">
              ${fbHtml(row.key, { title: row.text })}
            </div>
          </div>`;
    })
    .join("");
  return `
    <section id="actions">
      <div class="sec-head"><span class="idx">04</span><h2>Action list</h2><span class="count">${capped.length} to move · check to resolve</span></div>
      <div class="actions">${items}</div>
    </section>`;
}

function buildCarryover(input: BuildBriefInput): string {
  const items = input.carryover ?? [];
  if (items.length === 0) return "";
  const cards = items
    .slice(0, 8)
    .map((item) => {
      const age =
        item.ageDays >= 1
          ? `<span class="carry-item__age">${item.ageDays}d open</span>`
          : "";
      // No inner src-row wrapper — the row below already provides one.
      const source = item.citation
        ? srcHtml(item.citation, item.projectInternalId)
        : "";
      return `
          <div class="carry-item" data-fb-item>
            <div class="carry-item__ref">${esc(item.project || "Portfolio")} · carried from yesterday</div>
            <h4>${esc(truncate(cleanProse(item.title), 90))}</h4>
            ${age}
            <p>${esc(truncate(cleanProse(item.summary), 220))}</p>
            <div class="src-row">${source}${fbHtml(item.key, { title: item.title, project: item.project })}</div>
          </div>`;
    })
    .join("");
  return `
    <section id="carryover">
      <div class="sec-head"><span class="idx">08</span><h2>Still open from yesterday</h2><span class="count">${Math.min(items.length, 8)} unresolved · don't let these drop</span></div>
      <div class="carryover">${cards}</div>
    </section>`;
}

function buildRail(sectionIds: Array<{ id: string; label: string }>): string {
  const links = sectionIds
    .map(
      (section, index) =>
        `<a href="#${section.id}" data-target="${section.id}"><span class="num">0${index + 1}</span><span class="lbl">${esc(section.label)}</span></a>`,
    )
    .join("\n      ");
  return `
  <aside class="rail">
    <div class="rail__title">Contents</div>
    <nav aria-label="Brief sections">
      ${links}
    </nav>
  </aside>`;
}

function buildFooter(input: BuildBriefInput): string {
  const { packet } = input;
  const counts = coverageCounts(packet);
  const generated = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(parseDate(packet.generatedAt) ?? new Date(0));
  return `
<footer>
  <div class="footer__inner">
    <div class="footer__cov">
      <b>Source coverage</b> &middot; ${esc(fmtLongDate(packet.generatedAt))} &middot; ${packet.windowDays}-day window<br />
      ${counts.Meeting} meetings &middot; ${counts.Email} emails &middot; ${counts.Teams} teams messages &middot; ${counts.Document} documents<br />
      ${counts.total} sources synthesized
    </div>
    <div class="footer__note">
      Every claim links to its source. Meeting links open the transcript; email links open the original.
      <div class="footer__verify">Compiled ${esc(generated)} ET &middot; AI-assisted — verify before acting</div>
    </div>
  </div>
</footer>`;
}

// ── entry points ────────────────────────────────────────────────────────────────

export function buildBriefBody(input: BuildBriefInput): string {
  const sections: Array<{ id: string; label: string; html: string }> = [
    { id: "read", label: "Today's read", html: buildTodaysRead(input) },
    { id: "decisions", label: "Decisions", html: buildDecisions(input) },
    { id: "watch", label: "Watch", html: buildWatch(input) },
    { id: "actions", label: "Action list", html: buildActions(input) },
    { id: "projects", label: "Projects", html: buildProjects(input) },
    { id: "calendar", label: "This week", html: buildCalendar(input) },
    { id: "meetings", label: "Meetings", html: buildMeetings(input) },
    { id: "carryover", label: "Still open", html: buildCarryover(input) },
  ].filter((section) => section.html.trim().length > 0);

  if (sections.length === 0) {
    return buildEmptyBody("Today's brief is thin");
  }

  const rail = buildRail(sections.map(({ id, label }) => ({ id, label })));
  const content = sections.map((section) => section.html).join("\n");

  return `${buildMasthead(input)}
<div class="shell">
  ${rail}
  <main class="content">
${content}
  </main>
</div>
${buildFooter(input)}`;
}

export function buildEmptyBody(title = "No brief available yet"): string {
  return `
<div class="brief-empty">
  <h2>${esc(title)}</h2>
  <p>Today's executive brief hasn't been generated yet, or no material items surfaced in the current window. Check back after the next daily run, or open the operating brief at /executive to regenerate.</p>
</div>`;
}
