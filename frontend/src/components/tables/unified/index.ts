"use client";

export { TableToolbar, type ColumnConfig, type FilterConfig, type TableToolbarFeatures, type TableToolbarProps, type ViewMode } from "./table-toolbar";
export { DetailPanel, type DetailPanelProps, type DetailFieldConfig, type RelatedSectionConfig } from "./detail-panel";
export {
  TableCountIndicator,
  TableDateValue,
  TableStatusDot,
  TableTagBadge,
  TableAvatarUsers,
  TableIconLinks,
  TableRowActionsMenu,
  CellText,
  CellBadge,
  CellLink,
  CellEmail,
  TruncatedCell,
  formatParticipantDisplayName,
  type TableBadgeVariant,
  type TableRowActionItem,
  type CellColorMap,
} from "./table-primitives";
export {
  UnifiedTablePage,
  TableExpandedRow,
  type UnifiedTablePageProps,
  type TableColumn,
  type UnifiedTableFeatures,
} from "./unified-table-page";
export { useUnifiedTableState, type UnifiedTableState, type UnifiedTableStateOptions, type FilterValue } from "./use-unified-table-state";
export { TablePageActions, type TablePageActionsProps, type TablePageActionItem } from "./table-page-actions";
