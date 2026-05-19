import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { createToolGuardrails } from "./guardrails";
import { type ToolTracePayload, withTrace as _withTrace } from "./tool-utils";
import { listOutlookCalendarEvents } from "@/lib/microsoft-graph/calendar-events";

type AnyRow = Record<string, unknown>;

export type CreateOutlookOperationsToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
  pinnedProjectId?: number;
};

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: CreateOutlookOperationsToolsOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return _withTrace(
    name,
    options,
    execute,
    "Outlook operations failed during retrieval. Tell the user exactly which Outlook source could not be checked, then continue with any other successful data instead of ending the response.",
  );
}

function cleanPreview(value: unknown, limit = 500): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
}

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  const match = normalized.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  return match?.[0] ?? null;
}

function getPrimarySyncedMailbox(): string | null {
  return (
    normalizeEmail(process.env.AI_ASSISTANT_DEFAULT_OUTLOOK_MAILBOX) ??
    normalizeEmail(process.env.OUTLOOK_OPERATOR_MAILBOX) ??
    normalizeEmail(process.env.MICROSOFT_SYNC_USERS?.split(",")[0])
  );
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isDisplayableOutlookEmail(row: AnyRow): boolean {
  if (row.match_status === "ignored") {
    return false;
  }

  const sourceMetadata = row.source_metadata;
  if (!sourceMetadata || typeof sourceMetadata !== "object") {
    return true;
  }

  const classification = (sourceMetadata as { intake_classification?: unknown }).intake_classification;
  if (!classification || typeof classification !== "object") {
    return true;
  }

  const action = (classification as { action?: unknown }).action;
  return action !== "skip" && action !== "quarantine";
}

function emailSummary(row: AnyRow) {
  const project = row.projects && typeof row.projects === "object"
    ? row.projects as { id?: number; name?: string | null; project_number?: string | null }
    : null;

  return {
    id: row.id,
    graphMessageId: row.graph_message_id,
    mailboxUserId: row.mailbox_user_id,
    conversationId: row.conversation_id,
    subject: row.subject,
    fromName: row.from_name,
    fromEmail: row.from_email,
    toList: stringArray(row.to_list),
    ccList: stringArray(row.cc_list),
    receivedAt: row.received_at,
    status: row.status,
    matchStatus: row.match_status,
    projectId: row.project_id,
    project: project
      ? {
          id: project.id,
          name: project.name,
          projectNumber: project.project_number,
        }
      : null,
    hasAttachments: row.has_attachments,
    webLink: row.web_link,
    preview: cleanPreview(row.body_text ?? row.body ?? row.body_html),
  };
}

function normalizeSubscription(row: AnyRow) {
  return {
    id: row.id,
    source: row.source,
    resource: row.resource,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    changeType: row.change_type,
    status: row.status,
    expirationAt: row.expiration_at,
    lastNotificationAt: row.last_notification_at,
    lastLifecycleEventAt: row.last_lifecycle_event_at,
    lastRenewedAt: row.last_renewed_at,
    lastErrorMessage: row.last_error_message,
  };
}

function normalizeSyncState(row: AnyRow) {
  return {
    id: row.id,
    source: row.source,
    resourceId: row.resource_id,
    resourceName: row.resource_name,
    syncStatus: row.sync_status,
    lastSyncAt: row.last_sync_at,
    itemsSynced: row.items_synced,
    errorMessage: row.error_message,
    updatedAt: row.updated_at,
  };
}

export function createOutlookOperationsTools(
  userId: string,
  options: CreateOutlookOperationsToolsOptions = {},
) {
  const supabase = createServiceClient();
  const guardrails = createToolGuardrails(userId, {
    pinnedProjectId: options.pinnedProjectId,
  });

  async function requireAdminForOutlook() {
    const scope = await guardrails.getScope();
    if (scope.isAdmin) return { ok: true as const };
    return {
      ok: false as const,
      error:
        "Outlook mailbox access is admin-only in Alleato. I can still use project records, meetings, and documents you have access to.",
    };
  }

  async function scopedProjectFilter(projectId?: number | null) {
    const scope = await guardrails.getScope();
    if (scope.isAdmin) {
      if (typeof scope.pinnedProjectId === "number") return [scope.pinnedProjectId];
      if (typeof projectId === "number") return [projectId];
      return null;
    }

    const scoped = await guardrails.getScopedProjectIds(projectId);
    return scoped.length > 0 ? scoped : [];
  }

  return {
    getRecentOutlookEmails: tool({
	      description:
	        "Read recent synced Outlook email rows from Microsoft 365. Use for inbox-style questions such as 'what emails came in today', 'show recent Outlook mail', 'what needs a reply', or 'what has Brandon received about this project'. This reads synced Outlook intake table rows, not semantic RAG and not a direct Microsoft Graph live read. For Brandon/operator inbox work, pass mailboxUserId='bclymer@alleatogroup.com'.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Optional project ID to scope recent emails"),
        mailboxUserId: z.string().optional().describe("Optional Outlook mailbox user ID/email"),
        senderEmail: z.string().optional().describe("Optional sender email filter"),
        query: z.string().optional().describe("Optional keyword filter across subject, sender, and body text"),
        since: z.string().optional().describe("Optional ISO timestamp lower bound"),
        limit: z.number().optional().default(15).describe("Maximum emails to return"),
      }),
      execute: withTrace(
        "getRecentOutlookEmails",
        options,
        async ({ projectId, mailboxUserId, senderEmail, query, since, limit }) => {
          const access = await requireAdminForOutlook();
          if (!access.ok) return { error: access.error };

          const projectScope = await scopedProjectFilter(projectId);
          if (Array.isArray(projectScope) && projectScope.length === 0) {
            return { emails: [], error: "No accessible project scope is available for this Outlook lookup." };
          }

          const targetLimit = Math.min(Math.max(limit ?? 15, 1), 50);
          let dbQuery = supabase
            .from("outlook_email_intake")
            .select(
              "id,graph_message_id,mailbox_user_id,project_id,conversation_id,subject,body,body_text,body_html,from_name,from_email,to_list,cc_list,match_status,status,received_at,has_attachments,web_link,source_metadata,projects!outlook_email_intake_project_id_fkey(id,name,project_number)",
            )
            .is("deleted_at", null)
            .neq("match_status", "ignored")
            .order("received_at", { ascending: false, nullsFirst: false })
            .limit(Math.min(targetLimit * 4, 200));

          if (Array.isArray(projectScope)) {
            dbQuery = dbQuery.in("project_id", projectScope);
          }
	          const effectiveMailboxUserId =
	            normalizeEmail(mailboxUserId) ??
	            (!projectId && !senderEmail && !query ? getPrimarySyncedMailbox() : null);
	          if (effectiveMailboxUserId) {
	            dbQuery = dbQuery.eq("mailbox_user_id", effectiveMailboxUserId);
	          }
          if (senderEmail?.trim()) {
            dbQuery = dbQuery.ilike("from_email", senderEmail.trim());
          }
          if (since?.trim()) {
            dbQuery = dbQuery.gte("received_at", since.trim());
          }
          if (query?.trim()) {
            const pattern = `%${query.trim()}%`;
            dbQuery = dbQuery.or(
              `subject.ilike.${pattern},body_text.ilike.${pattern},from_email.ilike.${pattern},from_name.ilike.${pattern}`,
            );
          }

          const { data, error } = await dbQuery;
          if (error) {
            throw new Error(`Recent Outlook email lookup failed: ${error.message}`);
          }

          const emails = ((data ?? []) as AnyRow[])
            .filter(isDisplayableOutlookEmail)
            .slice(0, targetLimit)
            .map(emailSummary);
          return {
            source: "outlook_email_intake",
            count: emails.length,
            emails,
            operationalNote:
              "These are synced Outlook rows. For exact mailbox freshness, also call getOutlookOperationsStatus.",
          };
        },
      ),
    }),

    readOutlookEmailThread: tool({
      description:
        "Read a synced Outlook email conversation/thread from the database by conversation ID, intake email ID, or Graph message ID. Use before drafting replies or summarizing a specific email thread.",
      inputSchema: z.object({
        conversationId: z.string().optional(),
        intakeEmailId: z.number().optional(),
        graphMessageId: z.string().optional(),
        limit: z.number().optional().default(25),
      }),
      execute: withTrace(
        "readOutlookEmailThread",
        options,
        async ({ conversationId, intakeEmailId, graphMessageId, limit }) => {
          const access = await requireAdminForOutlook();
          if (!access.ok) return { error: access.error };

          if (!conversationId && !intakeEmailId && !graphMessageId) {
            return {
              error:
                "readOutlookEmailThread needs conversationId, intakeEmailId, or graphMessageId so it can avoid guessing the thread.",
            };
          }

          let resolvedConversationId = conversationId?.trim() || null;
          if (!resolvedConversationId && (intakeEmailId || graphMessageId)) {
            let lookup = supabase
              .from("outlook_email_intake")
              .select("conversation_id,project_id")
              .is("deleted_at", null)
              .limit(1);
            if (intakeEmailId) lookup = lookup.eq("id", intakeEmailId);
            if (graphMessageId) lookup = lookup.eq("graph_message_id", graphMessageId);
            const { data, error } = await lookup.maybeSingle();
            if (error) throw new Error(`Outlook thread seed lookup failed: ${error.message}`);
            resolvedConversationId = data?.conversation_id ?? null;

            if (typeof data?.project_id === "number") {
              const projectScope = await scopedProjectFilter(data.project_id);
              if (Array.isArray(projectScope) && !projectScope.includes(data.project_id)) {
                return { error: "You do not have access to the project linked to this Outlook thread." };
              }
            }
          }

          if (!resolvedConversationId) {
            return { error: "The selected Outlook email does not have a conversation_id." };
          }

          const targetLimit = Math.min(Math.max(limit ?? 25, 1), 100);
          const { data, error } = await supabase
            .from("outlook_email_intake")
            .select(
              "id,graph_message_id,mailbox_user_id,project_id,conversation_id,subject,body,body_text,body_html,from_name,from_email,to_list,cc_list,match_status,status,received_at,has_attachments,web_link,source_metadata,projects!outlook_email_intake_project_id_fkey(id,name,project_number)",
            )
            .eq("conversation_id", resolvedConversationId)
            .is("deleted_at", null)
            .neq("match_status", "ignored")
            .order("received_at", { ascending: true, nullsFirst: true })
            .limit(targetLimit);

          if (error) {
            throw new Error(`Outlook thread lookup failed: ${error.message}`);
          }

          const messages = ((data ?? []) as AnyRow[])
            .filter(isDisplayableOutlookEmail)
            .map(emailSummary);
          return {
            source: "outlook_email_intake",
            conversationId: resolvedConversationId,
            messageCount: messages.length,
            messages,
          };
        },
      ),
    }),

    getOutlookOperationsStatus: tool({
      description:
        "Check Outlook/Microsoft Graph operational status for real-time email capability: Graph subscriptions, webhook notifications, sync freshness, and errors. Use when the user asks whether Outlook monitoring, notifications, or real-time email querying is working.",
      inputSchema: z.object({
        source: z.enum(["outlook_email", "all_graph"]).optional().default("outlook_email"),
      }),
      execute: withTrace(
        "getOutlookOperationsStatus",
        options,
        async ({ source }) => {
          const access = await requireAdminForOutlook();
          if (!access.ok) return { error: access.error };

          const targetSource = source ?? "outlook_email";
          let subscriptionQuery = supabase
            .from("graph_subscriptions")
            .select(
              "id,source,resource,resource_id,resource_name,change_type,status,expiration_at,last_notification_at,last_lifecycle_event_at,last_renewed_at,last_error_message",
            )
            .order("updated_at", { ascending: false })
            .limit(20);
          let syncQuery = supabase
            .from("graph_sync_state")
            .select("id,source,resource_id,resource_name,sync_status,last_sync_at,items_synced,error_message,updated_at")
            .order("updated_at", { ascending: false })
            .limit(20);

          if (targetSource === "outlook_email") {
            subscriptionQuery = subscriptionQuery.eq("source", "outlook_email");
            syncQuery = syncQuery.eq("source", "outlook_email");
          }

          const [
            { data: subscriptions, error: subscriptionError },
            { data: syncStates, error: syncError },
          ] = await Promise.all([subscriptionQuery, syncQuery]);

          if (subscriptionError) {
            throw new Error(`Graph subscription lookup failed: ${subscriptionError.message}`);
          }
          if (syncError) {
            throw new Error(`Graph sync-state lookup failed: ${syncError.message}`);
          }

          const normalizedSubscriptions = ((subscriptions ?? []) as AnyRow[]).map(normalizeSubscription);
          const normalizedSyncStates = ((syncStates ?? []) as AnyRow[]).map(normalizeSyncState);
          const activeSubscriptions = normalizedSubscriptions.filter((row) => row.status === "active");
          const erroredSyncStates = normalizedSyncStates.filter((row) => row.syncStatus === "error" || row.errorMessage);

          return {
            source: targetSource,
            subscriptionCount: normalizedSubscriptions.length,
            activeSubscriptionCount: activeSubscriptions.length,
            syncStateCount: normalizedSyncStates.length,
            erroredSyncStateCount: erroredSyncStates.length,
            subscriptions: normalizedSubscriptions,
            syncStates: normalizedSyncStates,
            failsLoudly:
              "Webhook notifications are recorded into source_sync_runs and subscription/sync failures are visible through graph_subscriptions, graph_sync_state, source-sync health, and Render cron failures.",
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // getOutlookCalendarEvents — read the owner's Outlook calendar.
    // -----------------------------------------------------------------------

    getOutlookCalendarEvents: tool({
      description:
        "Read calendar events from Outlook for a date window. " +
        "Use this when the user asks 'what meetings do I have today / tomorrow / this week', " +
        "'is my calendar free Tuesday afternoon', 'who am I meeting with', 'what's next on my schedule'. " +
        "Use createOutlookCalendarInvite for WRITES (scheduling); this tool only READS. " +
        "Returns event subject, start/end (in America/New_York timezone), location, attendees, organizer, " +
        "online meeting join URL, and importance. Recurring meetings are expanded into individual instances " +
        "within the window. Cancelled and all-day events are included; the caller can filter as needed.",
      inputSchema: z.object({
        window: z
          .enum([
            "today",
            "tomorrow",
            "this_week",
            "next_week",
            "next_24_hours",
            "next_7_days",
            "custom",
          ])
          .default("tomorrow")
          .describe(
            "Convenience window. Use 'custom' with startIso/endIso for arbitrary ranges.",
          ),
        startIso: z
          .string()
          .optional()
          .describe("Required when window='custom'. ISO 8601 timestamp; assumed America/New_York if no offset."),
        endIso: z
          .string()
          .optional()
          .describe("Required when window='custom'. Exclusive end timestamp."),
        userEmail: z
          .string()
          .optional()
          .describe(
            "Mailbox to read (e.g. 'bclymer@alleatogroup.com'). Defaults to the configured owner mailbox.",
          ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .default(25)
          .describe("Max events to return (1-50, default 25)."),
        includeCancelled: z
          .boolean()
          .optional()
          .default(false)
          .describe("If false (default), cancelled events are filtered out of the result."),
      }),
      execute: withTrace(
        "getOutlookCalendarEvents",
        options,
        async ({ window, startIso, endIso, userEmail, limit, includeCancelled }) => {
          const access = await requireAdminForOutlook();
          if (!access.ok) return { error: access.error };

          const resolved = resolveCalendarWindow(window, startIso, endIso);
          if ("error" in resolved) return { error: resolved.error };

          const result = await listOutlookCalendarEvents({
            startIso: resolved.startIso,
            endIso: resolved.endIso,
            userEmail: userEmail ?? null,
            limit: limit ?? 25,
          });

          if (!result.ok) {
            return { error: result.error, userEmail: result.userEmail ?? null };
          }

          const events = includeCancelled
            ? result.events
            : result.events.filter((event) => !event.isCancelled);

          return {
            userEmail: result.userEmail,
            window,
            startIso: resolved.startIso,
            endIso: resolved.endIso,
            timezone: "America/New_York",
            eventCount: events.length,
            truncated: result.truncated,
            events: events.map((event) => ({
              id: event.id,
              subject: event.subject,
              start: event.startDateTime,
              end: event.endDateTime,
              isAllDay: event.isAllDay,
              isCancelled: event.isCancelled,
              location: event.location,
              organizerEmail: event.organizerEmail,
              organizerName: event.organizerName,
              attendees: event.attendees.slice(0, 12).map((a) => ({
                email: a.email,
                name: a.name,
                response: a.response,
                type: a.type,
              })),
              attendeeCount: event.attendees.length,
              bodyPreview: event.bodyPreview,
              joinUrl: event.joinUrl,
              webLink: event.webLink,
              importance: event.importance,
              showAs: event.showAs,
              responseStatus: event.responseStatus,
            })),
            failsLoudly:
              "If Graph returns an auth or permission error, the tool surfaces it inline in the `error` field and the AI must explain to the user which mailbox or permission is missing rather than pretending the calendar was checked.",
          };
        },
      ),
    }),
  };
}

// ---------------------------------------------------------------------------
// Calendar window helper — resolves enum windows to ISO timestamps in the
// America/New_York timezone (the owner's local timezone).
// ---------------------------------------------------------------------------

function resolveCalendarWindow(
  window: "today" | "tomorrow" | "this_week" | "next_week" | "next_24_hours" | "next_7_days" | "custom",
  startIsoInput?: string,
  endIsoInput?: string,
): { startIso: string; endIso: string } | { error: string } {
  if (window === "custom") {
    if (!startIsoInput || !endIsoInput) {
      return {
        error:
          "window='custom' requires both startIso and endIso (ISO 8601 with offset).",
      };
    }
    return { startIso: startIsoInput, endIso: endIsoInput };
  }

  const now = new Date();
  const easternToday = easternDayBounds(now, 0);

  switch (window) {
    case "today":
      return easternToday;
    case "tomorrow":
      return easternDayBounds(now, 1);
    case "this_week": {
      // ET-local week boundary: today 00:00 → Sunday 23:59 of the same ET week.
      const startOfTodayLocal = easternStartOfDay(now, 0);
      const daysToSunday = 7 - localEasternDayOfWeek(now); // 0=Sun..6=Sat
      const endLocal = easternStartOfDay(now, daysToSunday + 1);
      return { startIso: startOfTodayLocal, endIso: endLocal };
    }
    case "next_week": {
      const daysToNextMon = 8 - localEasternDayOfWeek(now);
      const startLocal = easternStartOfDay(now, daysToNextMon);
      const endLocal = easternStartOfDay(now, daysToNextMon + 7);
      return { startIso: startLocal, endIso: endLocal };
    }
    case "next_24_hours":
      return {
        startIso: now.toISOString(),
        endIso: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
      };
    case "next_7_days":
      return {
        startIso: now.toISOString(),
        endIso: new Date(now.getTime() + 7 * 24 * 3_600_000).toISOString(),
      };
  }
}

function easternDayBounds(now: Date, daysFromToday: number): { startIso: string; endIso: string } {
  return {
    startIso: easternStartOfDay(now, daysFromToday),
    endIso: easternStartOfDay(now, daysFromToday + 1),
  };
}

function easternStartOfDay(now: Date, daysFromToday: number): string {
  // Compute today's ET calendar date, advance by N days, then format as
  // "<date>T00:00:00<eastern-offset>". Graph accepts this and will
  // interpret it in the embedded offset's timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  // Compose the date in UTC then shift by daysFromToday whole days.
  const base = new Date(Date.UTC(year, month - 1, day + daysFromToday, 12, 0, 0));
  const baseEasternDate = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);
  const getBase = (type: string) => baseEasternDate.find((p) => p.type === type)?.value ?? "";
  const y = getBase("year");
  const m = getBase("month");
  const d = getBase("day");
  const offset = easternOffset(base);
  return `${y}-${m}-${d}T00:00:00${offset}`;
}

function easternOffset(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(d);
  const value = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-05";
  const match = value.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return "-05:00";
  const sign = match[1];
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] ?? "00").padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}

function localEasternDayOfWeek(d: Date): number {
  // 0 = Sunday, 6 = Saturday — in America/New_York timezone.
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(d);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[name] ?? 0;
}
