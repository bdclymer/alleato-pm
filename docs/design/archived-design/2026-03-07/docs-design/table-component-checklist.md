# Table Page Scalability Checklist

Use this checklist to keep table pages consistent and scalable.

## Structure

- Page uses `AppLayout` with consistent sidebar and top bar
- Page header contains title, subtitle, and action group
- Filters and view controls are distinct from table content

## Table Behavior

- Sorting supports multi-column strategy or single-column (defined)
- Column visibility and order can be configured
- Row selection supports bulk actions
- Pagination and total count are always present

## Cell Types

- Common cell renderers are reusable (text, meta, avatar, tag, status, date, money, icon)
- Null/empty cells display consistently
- Cell overflow rules are standardized (truncate, wrap, tooltip)

## States

- Loading skeleton mirrors the table layout
- Empty state differentiates no data vs no results
- Errors are actionable and recoverable

## Accessibility

- Table header and rows are keyboard navigable
- Selection controls are labeled
- Sorting is announced via aria labels

## Extensibility

- New columns can be added by defining a `CellRenderer`
- Column config is centralized and schema-driven
- Row actions are defined in one place
