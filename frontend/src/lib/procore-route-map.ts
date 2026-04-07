/**
 * Maps URL pathname patterns to Procore manifest feature slugs.
 * Used by the Procore Reference Panel to auto-load the right screenshots.
 */

export interface ProcoreScreenshot {
  stateId: string;
  label: string;
  src: string;
}

/** Maps a pathname to a feature slug. Returns null if no match. */
export function featureFromPathname(pathname: string): string | null {
  // Strip leading /[projectId]/ segment
  const stripped = pathname.replace(/^\/\d+\//, "/");

  if (stripped.startsWith("/budget")) return "budget";
  if (stripped.startsWith("/change-events")) return "change-events";
  if (stripped.startsWith("/change-orders")) return "change-orders";
  if (stripped.startsWith("/commitments")) return "commitments";
  if (stripped.startsWith("/daily-log")) return "daily-log";
  if (stripped.startsWith("/direct-costs")) return "direct-costs";
  if (stripped.startsWith("/directory")) return "directory";
  if (stripped.startsWith("/documents")) return "documents";
  if (stripped.startsWith("/drawings")) return "drawings";
  if (stripped.startsWith("/invoicing")) return "invoicing";
  if (stripped.startsWith("/photos")) return "photos";
  if (stripped.startsWith("/prime-contracts")) return "prime-contracts";
  if (stripped.startsWith("/punch-list")) return "punch-list";
  if (stripped.startsWith("/rfis")) return "rfis";
  if (stripped.startsWith("/specifications")) return "specifications";
  if (stripped.startsWith("/submittals")) return "submittals";
  if (stripped.startsWith("/meetings")) return "meetings";

  return null;
}

/**
 * Human-readable label for a screenshot state ID.
 * Falls back to title-casing the state ID.
 */
export function stateLabel(stateId: string): string {
  const overrides: Record<string, string> = {
    "list": "List View",
    "list-purchase-orders": "Purchase Orders List",
    "list-purchase-order-change-orders": "PO Change Orders List",
    "create-form": "Create Form",
    "detail": "Detail View",
    "detail-schedule-of-values": "Schedule of Values",
    "detail-change-orders": "Change Orders Tab",
    "detail-payments": "Payments Tab",
    "detail-add-to-dropdown": "Add To Dropdown",
    "detail-send-rfqs": "Send RFQs",
    "detail-line-items": "Line Items",
    "detail-markup": "Markup",
    "detail-prime-contract-cos": "Prime Contract COs",
    "upload-form": "Upload Form",
    "list-owner": "Owner Invoices",
    "list-subcontractor": "Subcontractor Invoices",
    "po-invoices-list": "PO Invoices",
  };
  return overrides[stateId] ?? stateId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Builds screenshot URLs for a feature from its manifest state IDs. */
export function screenshotsForFeature(feature: string, stateIds: string[]): ProcoreScreenshot[] {
  return stateIds.map((stateId) => ({
    stateId,
    label: stateLabel(stateId),
    src: `/api/procore-screenshots/${feature}/${stateId}.png`,
  }));
}
