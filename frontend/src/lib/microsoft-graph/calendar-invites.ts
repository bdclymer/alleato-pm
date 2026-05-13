import "server-only";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = "https://login.microsoftonline.com";

export type OutlookInviteAttendee = {
  email: string;
  name?: string;
  type?: "required" | "optional";
};

export type OutlookCalendarInviteInput = {
  organizerEmail?: string | null;
  subject: string;
  body: string;
  startDateTime: string;
  endDateTime: string;
  timeZone?: string | null;
  location?: string | null;
  attendees: OutlookInviteAttendee[];
  isOnlineMeeting?: boolean;
  transactionId?: string;
};

export type OutlookCalendarInviteResult = {
  id: string;
  subject: string;
  webLink: string | null;
  joinUrl: string | null;
  organizerEmail: string;
  startDateTime: string;
  endDateTime: string;
  timeZone: string;
  attendeeCount: number;
};

type GraphEnvResult =
  | {
      ok: true;
      clientId: string;
      clientSecret: string;
      tenantId: string;
    }
  | {
      ok: false;
      missing: string[];
    };

type GraphEventResponse = {
  id?: string;
  subject?: string;
  webLink?: string | null;
  start?: { dateTime?: string | null; timeZone?: string | null } | null;
  end?: { dateTime?: string | null; timeZone?: string | null } | null;
  onlineMeeting?: { joinUrl?: string | null } | null;
};

function graphEnv(): GraphEnvResult {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const missing = ([
    ["MICROSOFT_CLIENT_ID", clientId],
    ["MICROSOFT_CLIENT_SECRET", clientSecret],
    ["MICROSOFT_TENANT_ID", tenantId],
  ] as const)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (!clientId || !clientSecret || !tenantId) return { ok: false, missing };
  return { ok: true, clientId, clientSecret, tenantId };
}

function fallbackOrganizerEmail(): string | null {
  const configured =
    process.env.MICROSOFT_CALENDAR_USER ??
    process.env.OUTLOOK_CALENDAR_USER ??
    process.env.MICROSOFT_SYNC_USERS?.split(",")[0];
  const normalized = configured?.trim().toLowerCase();
  return normalized || null;
}

export function resolveOutlookOrganizerEmail(
  organizerEmail?: string | null,
): string {
  const resolved = organizerEmail?.trim().toLowerCase() || fallbackOrganizerEmail();
  if (!resolved) {
    throw new Error(
      [
        "Outlook calendar organizer is not configured.",
        "Cause: createOutlookCalendarInvite needs organizerEmail or MICROSOFT_CALENDAR_USER / OUTLOOK_CALENDAR_USER / MICROSOFT_SYNC_USERS.",
        "Detection gap: the assistant previously had a calendar-looking widget without a real Graph execution target.",
        "Prevention: require an explicit organizer mailbox before creating Outlook invites.",
      ].join(" "),
    );
  }
  return resolved;
}

async function getGraphToken(): Promise<string> {
  const env = graphEnv();
  if (!env.ok) {
    throw new Error(
      [
        `Missing Microsoft Graph env vars: ${env.missing.join(", ")}.`,
        "Cause: Outlook calendar invite creation requires Microsoft Graph application credentials.",
        "Detection gap: calendar actions were not previously checked against Graph runtime configuration.",
        "Prevention: fail before attempting the write when Graph credentials are incomplete.",
      ].join(" "),
    );
  }

  const response = await fetch(`${TOKEN_URL}/${env.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.clientId,
      client_secret: env.clientSecret,
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!response.ok) {
    throw new Error(`Microsoft Graph token request failed: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Microsoft Graph token request returned no access_token.");
  }
  return data.access_token;
}

function normalizeDateTime(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${fieldName} is required for Outlook calendar invites.`);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be an ISO-compatible date/time string.`);
  }
  return trimmed;
}

function normalizeAttendees(attendees: OutlookInviteAttendee[]) {
  return attendees.map((attendee) => {
    const address = attendee.email.trim().toLowerCase();
    if (!address) throw new Error("Every Outlook invite attendee needs an email address.");
    return {
      emailAddress: {
        address,
        name: attendee.name?.trim() || address,
      },
      type: attendee.type === "optional" ? "optional" : "required",
    };
  });
}

export function buildOutlookCalendarEventPayload(input: OutlookCalendarInviteInput) {
  const timeZone = input.timeZone?.trim() || "Eastern Standard Time";
  const startDateTime = normalizeDateTime(input.startDateTime, "startDateTime");
  const endDateTime = normalizeDateTime(input.endDateTime, "endDateTime");

  if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
    throw new Error("Outlook invite endDateTime must be after startDateTime.");
  }

  return {
    subject: input.subject.trim(),
    body: {
      contentType: "HTML",
      content: input.body.trim().replace(/\n/g, "<br />"),
    },
    start: {
      dateTime: startDateTime,
      timeZone,
    },
    end: {
      dateTime: endDateTime,
      timeZone,
    },
    location: {
      displayName: input.location?.trim() || "Microsoft Teams",
    },
    attendees: normalizeAttendees(input.attendees),
    isOnlineMeeting: input.isOnlineMeeting ?? true,
    onlineMeetingProvider: input.isOnlineMeeting === false ? undefined : "teamsForBusiness",
    transactionId: input.transactionId,
  };
}

export function buildCalendarInviteAdaptiveCard(params: {
  title: string;
  startLabel: string;
  endLabel: string;
  location: string;
  attendeeLabel: string;
  status: "draft" | "created" | "blocked";
  openUrl?: string | null;
}) {
  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: params.title,
        weight: "Bolder",
        size: "Medium",
        wrap: true,
      },
      {
        type: "FactSet",
        facts: [
          { title: "Start", value: params.startLabel },
          { title: "End", value: params.endLabel },
          { title: "Location", value: params.location },
          { title: "Attendees", value: params.attendeeLabel },
          { title: "Status", value: params.status },
        ],
      },
    ],
    actions: params.openUrl
      ? [
          {
            type: "Action.OpenUrl",
            title: "Open in Outlook",
            url: params.openUrl,
          },
        ]
      : [],
  };
}

export async function createOutlookCalendarInvite(
  input: OutlookCalendarInviteInput,
): Promise<OutlookCalendarInviteResult> {
  const organizerEmail = resolveOutlookOrganizerEmail(input.organizerEmail);
  const token = await getGraphToken();
  const payload = buildOutlookCalendarEventPayload(input);
  const response = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(organizerEmail)}/events`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body ? `: ${body.slice(0, 500)}` : "";
    throw new Error(`Microsoft Graph calendar event create failed: ${response.status} ${response.statusText}${detail}`);
  }

  const event = (await response.json()) as GraphEventResponse;
  if (!event.id) {
    throw new Error("Microsoft Graph calendar event create returned no event id.");
  }

  return {
    id: event.id,
    subject: event.subject ?? input.subject,
    webLink: event.webLink ?? null,
    joinUrl: event.onlineMeeting?.joinUrl ?? null,
    organizerEmail,
    startDateTime: event.start?.dateTime ?? input.startDateTime,
    endDateTime: event.end?.dateTime ?? input.endDateTime,
    timeZone: event.start?.timeZone ?? input.timeZone ?? "Eastern Standard Time",
    attendeeCount: input.attendees.length,
  };
}
