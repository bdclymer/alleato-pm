// Table components exports
export { DataTable } from "./DataTable";
export { DataTableToolbar } from "./DataTableToolbar";
export { DataTableFilters } from "./DataTableFilters";
export { DataTableColumnToggle } from "./DataTableColumnToggle";
export { DataTablePagination } from "./DataTablePagination";
export { DataTableBulkActions } from "./DataTableBulkActions";
export { DataTableEmptyState } from "./DataTableEmptyState";
export { DataTableSkeleton } from "./DataTableSkeleton";

// Configuration-driven table (GenericDataTable)
export { GenericDataTable } from "./generic-table-factory";
export type {
  GenericTableConfig,
  ColumnConfig,
  FilterConfig,
  EditConfig,
  RenderConfig,
  BadgeRenderConfig,
  CurrencyRenderConfig,
  TruncateRenderConfig,
  ArrayRenderConfig,
  JsonRenderConfig,
  NestedRenderConfig,
} from "./generic-table-factory";

// Note: SimpleTablePage is a Server Component and should be imported directly:
// import { SimpleTablePage } from '@/components/tables/simple-table-page'
// Do NOT export it from this barrel file as it breaks client component imports.

// Specialized data tables
export { EmployeesDataTable } from "./employees-data-table";
