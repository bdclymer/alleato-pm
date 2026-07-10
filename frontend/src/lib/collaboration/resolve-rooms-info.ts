import { entityTypeLabel } from "./rooms";

// Liveblocks calls `resolveRoomsInfo` to turn an opaque room id into a human name
// and a click-through URL. Without it, comment/thread inbox notifications fall
// back to printing the raw room id (e.g. "alleato:page:1067:prime-contracts:...")
// as the notification title — the gibberish an unresolved room produces. This
// resolver is intentionally synchronous: page room ids already encode the URL
// path, so no server round-trip is needed.

const PAGE_PREFIX = "alleato:page:";
const ENTITY_PREFIX = "alleato:";

// URL section slug -> friendly singular label used in notification titles. Keyed
// to the real route folders under app/(main)/[projectId]. The most specific
// (deepest) known section in a path wins.
const SECTION_LABELS: Record<string, string> = {
  "prime-contracts": "Prime Contract",
  "prime-contract-pcos": "Change Order",
  "commitment-pcos": "Change Order",
  "change-orders": "Change Order",
  "change-events": "Change Event",
  "change-management": "Change Management",
  pcos: "Change Order",
  rfis: "RFI",
  submittals: "Submittal",
  commitments: "Commitment",
  "direct-costs": "Direct Cost",
  invoices: "Invoice",
  invoicing: "Invoicing",
  "billing-periods": "Billing Period",
  budget: "Budget",
  sov: "Schedule of Values",
  drawings: "Drawing",
  specifications: "Specification",
  meetings: "Meeting",
  "daily-log": "Daily Log",
  directory: "Directory",
  documents: "Document",
  emails: "Email",
  transmittals: "Transmittal",
  estimates: "Estimate",
  "punch-list": "Punch List",
  schedule: "Schedule",
  timeline: "Timeline",
  tasks: "Task",
  "my-work": "My Work",
  photos: "Photos",
  "progress-reports": "Progress Report",
  "project-status-report": "Project Status Report",
  intelligence: "Intelligence",
  reporting: "Reporting",
  home: "Project Home",
  // pageRoomId() collapses the app root ("/") to the sentinel segment "root".
  root: "Home",
};

export type ResolvedRoomInfo = { name: string; url?: string };

function isIdSegment(segment: string): boolean {
  return (
    /^\d+$/.test(segment) || // numeric id (projectId, sequential ids)
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) // uuid
  );
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Turn a single room id into { name, url }. Two shapes exist:
//   Page rooms:   alleato:page:<path segments, colon-joined>   (see pageRoomId)
//   Entity rooms: alleato:<entityType>:<entityId>              (see getRoomId)
export function describeRoom(roomId: string): ResolvedRoomInfo {
  if (roomId.startsWith(PAGE_PREFIX)) {
    const segments = roomId.slice(PAGE_PREFIX.length).split(":").filter(Boolean);
    // pageRoomId() collapses the app root ("/") to the sentinel segment "root" —
    // resolve it back to "/" instead of the non-existent "/root" route.
    const isRoot = segments.length === 1 && segments[0] === "root";
    const url = isRoot ? "/" : `/${segments.join("/")}`;

    // Prefer the deepest recognized section (e.g. ".../change-orders/pcos/<id>"
    // -> "Change Order"); otherwise fall back to the deepest non-id segment.
    let known = "";
    let fallback = "";
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = segments[index];
      if (isIdSegment(segment)) continue;
      if (!fallback) fallback = titleCase(segment);
      if (SECTION_LABELS[segment]) {
        known = SECTION_LABELS[segment];
        break;
      }
    }

    return { name: known || fallback || "Page", url };
  }

  if (roomId.startsWith(ENTITY_PREFIX)) {
    const remainder = roomId.slice(ENTITY_PREFIX.length);
    const lastColon = remainder.lastIndexOf(":");
    if (lastColon > 0) {
      return { name: entityTypeLabel(remainder.slice(0, lastColon)) };
    }
  }

  // Unknown shape: never surface a raw id as a title — use a generic label.
  return { name: "Comment" };
}

export function resolveRoomsInfo({
  roomIds,
}: {
  roomIds: readonly string[];
}): ResolvedRoomInfo[] {
  return roomIds.map(describeRoom);
}
