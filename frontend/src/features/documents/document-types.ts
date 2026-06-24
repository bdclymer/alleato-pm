// Canonical document types, mirroring the DB classify_document_type() function
// and the document_type_taxonomy registry. Keep this list in sync with the
// migration 20260617210000_document_type_classifier.sql.

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "psr", label: "PSR" },
  { value: "schedule", label: "Schedule" },
  { value: "submittal", label: "Submittal" },
  { value: "pay_app", label: "Pay Application" },
  { value: "proposal", label: "Proposal" },
  { value: "estimate", label: "Estimate" },
  { value: "bid", label: "Bid" },
  { value: "drawing", label: "Drawing" },
  { value: "specification", label: "Specification" },
  { value: "permit", label: "Permit" },
  { value: "rfi", label: "RFI" },
  { value: "change_order", label: "Change Order" },
  { value: "subcontract", label: "Subcontract" },
  { value: "contract", label: "Contract / Owner" },
  { value: "invoice", label: "Invoice" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
  { value: "oac_meeting_minutes", label: "OAC Meeting Minutes" },
  { value: "safety", label: "Safety" },
  { value: "closeout", label: "Closeout" },
  { value: "design", label: "Design" },
  { value: "photo", label: "Photo" },
  { value: "other", label: "Other" },
] as const;

const DOCUMENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function documentTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return DOCUMENT_TYPE_LABELS[value] ?? value;
}
