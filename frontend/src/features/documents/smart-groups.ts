import {
  EMPTY_DOCUMENT_FILTERS,
  type DocumentFilterState,
} from "@/features/documents/documents-table-definition";

export interface SmartGroup {
  id: string;
  label: string;
  icon: string;
  filter: Partial<DocumentFilterState>;
  reclassifyTo: string | null;
}

export type SmartGroupCounts = Record<string, number>;

export const SMART_GROUPS: SmartGroup[] = [
  { id: "all", label: "All", icon: "files", filter: {}, reclassifyTo: null },
  { id: "drawings", label: "Drawings", icon: "blueprints", filter: { document_type: "drawing" }, reclassifyTo: "drawing" },
  { id: "submittals", label: "Submittals", icon: "file-check", filter: { document_type: "submittal" }, reclassifyTo: "submittal" },
  { id: "contracts", label: "Contracts", icon: "file-text", filter: { document_type: "contract" }, reclassifyTo: "contract" },
  { id: "specs", label: "Specs", icon: "file-description", filter: { document_type: "specification" }, reclassifyTo: "specification" },
  { id: "rfis", label: "RFIs", icon: "help-circle", filter: { document_type: "rfi" }, reclassifyTo: "rfi" },
  { id: "change_orders", label: "Change Orders", icon: "file-diff", filter: { document_type: "change_order" }, reclassifyTo: "change_order" },
  { id: "photos", label: "Photos", icon: "photo", filter: { document_type: "photo" }, reclassifyTo: "photo" },
  { id: "emails", label: "Emails", icon: "mail", filter: { type: "email" }, reclassifyTo: null },
];

export function smartGroupCountKey(group: SmartGroup): string {
  return group.id;
}

export function applySmartGroupFilter(
  base: DocumentFilterState,
  group: SmartGroup,
): DocumentFilterState {
  return { ...EMPTY_DOCUMENT_FILTERS, ...group.filter };
}
