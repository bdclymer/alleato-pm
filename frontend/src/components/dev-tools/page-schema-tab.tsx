"use client"
/* eslint-disable design-system/no-raw-heading */

import { useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  KeyRound,
  Link as LinkIcon,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"
import {
  findPageSchema,
  type PageSchemaEntry,
  type TableSchema,
} from "./page-schema-registry"

/* ── Table Accordion ───────────────────────────────────────────── */

function TableAccordion({ table }: { table: TableSchema }) {
  const [isOpen, setIsOpen] = useState(false)

  const pkColumns = table.columns.filter((c) => c.pk)
  const fkColumns = table.columns.filter((c) => c.fk)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          <Database className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-xs font-semibold">{table.name}</span>
          <span className="text-[10px] text-muted-foreground">
            ({table.columns.length} cols)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {fkColumns.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              {fkColumns.length} FK
            </Badge>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="bg-muted/20">
          {table.description && (
            <p className="px-6 pt-1 pb-0.5 text-[10px] text-muted-foreground italic">
              {table.description}
            </p>
          )}
          <Table>
            <thead>
              <tr className="border-b border-border">
                <th className="w-48 px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Column</th>
                <th className="w-24 px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Type</th>
                <th className="w-12 px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">PK</th>
                <th className="w-52 px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">FK</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <TableBody>
              {table.columns.map((col) => (
                <TableRow key={col.name} className="border-0">
                  <TableCell className="py-0.5 font-mono text-[11px]">
                    <span className={col.pk ? "font-bold text-primary" : ""}>
                      {col.name}
                    </span>
                    {col.nullable && (
                      <span className="ml-1 text-muted-foreground">?</span>
                    )}
                  </TableCell>
                  <TableCell className="py-0.5 font-mono text-[11px] text-muted-foreground">
                    {col.type}
                  </TableCell>
                  <TableCell className="py-0.5">
                    {col.pk && (
                      <KeyRound className="h-3 w-3 text-primary" />
                    )}
                  </TableCell>
                  <TableCell className="py-0.5 font-mono text-[11px]">
                    {col.fk && (
                      <span className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        {col.fk.table}.{col.fk.column}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-0.5 text-[11px] text-muted-foreground">
                    {col.notes?.startsWith("⚠️") ? (
                      <span className="text-warning flex items-start gap-1">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        {col.notes.replace("⚠️ ", "")}
                      </span>
                    ) : (
                      col.notes
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

/* ── Method Badge ──────────────────────────────────────────────── */

function MethodBadge({ method }: { method: string }) {
  const variants: Record<string, string> = {
    GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    POST: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    PATCH: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    PUT: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${variants[method] || ""}`}
    >
      {method}
    </span>
  )
}

/* ── Main Tab Component ────────────────────────────────────────── */

interface PageSchemaTabProps {
  pathname: string
  params: Record<string, string | string[] | undefined>
}

export function PageSchemaTab({ pathname, params }: PageSchemaTabProps) {
  const schema = findPageSchema(pathname)

  if (!schema) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No schema data available for this page.
        <br />
        <span className="text-xs">
          Add an entry to{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            page-schema-registry.ts
          </code>{" "}
          to enable.
        </span>
      </div>
    )
  }

  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : params.projectId

  // Resolve route parameters in API paths for display
  const resolveRoute = (path: string) => {
    let resolved = path
    if (projectId) resolved = resolved.replace("[projectId]", projectId)
    for (const [key, val] of Object.entries(params)) {
      if (val && !Array.isArray(val)) {
        resolved = resolved.replace(`[${key}]`, val)
      }
    }
    return resolved
  }

  const isFkMismatch = (fkTarget?: string, dropdownSource?: string) =>
    Boolean(fkTarget && dropdownSource && fkTarget !== dropdownSource)

  const fkMismatchCount = schema.fieldMappings.filter((m) =>
    isFkMismatch(m.fkTarget, m.dropdownSource),
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{schema.label}</h3>
          <p className="text-xs text-muted-foreground">
            {schema.tables.length} tables &middot;{" "}
            {schema.apiRoutes.length} routes &middot;{" "}
            {schema.fieldMappings.length} field mappings
            {fkMismatchCount > 0 && (
              <span className="ml-2 text-warning">
                ({fkMismatchCount} FK mismatches)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Section 1: Tables */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Database className="h-3.5 w-3.5" />
          Supabase Tables
        </h4>
        <div className="rounded-md border border-border">
          {schema.tables.map((table) => (
            <TableAccordion key={table.name} table={table} />
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 2: API Routes */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          API Routes
        </h4>
        <div className="space-y-1">
          {schema.apiRoutes.map((route, idx) => (
            <div
              key={`${route.method}-${route.path}-${idx}`}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
            >
              <MethodBadge method={route.method} />
              <code className="flex-1 font-mono text-foreground">
                {resolveRoute(route.path)}
              </code>
              <span className="shrink-0 text-muted-foreground">
                {route.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Section 3: Form Field → DB Column Mapping */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <ArrowRight className="h-3.5 w-3.5" />
          Form Field → DB Column Mapping
        </h4>
        <div className="rounded-md border border-border">
          <Table>
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Form Field</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">DB Table</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">DB Column</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">FK Target</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Dropdown Source</th>
                <th className="px-3 py-1 text-left text-[10px] font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <TableBody>
              {schema.fieldMappings.map((mapping, idx) => {
                const hasMismatch = isFkMismatch(mapping.fkTarget, mapping.dropdownSource)
                return (
                  <TableRow
                    key={`${mapping.formField}-${idx}`}
                    className={hasMismatch ? "bg-warning/5" : ""}
                  >
                    <TableCell className="font-mono text-xs font-medium">
                      {mapping.formField}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {mapping.dbTable}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {mapping.dbColumn}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {mapping.fkTarget && (
                        <span className="text-primary">{mapping.fkTarget}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {mapping.dropdownSource && (
                        <span className={hasMismatch ? "text-warning font-semibold" : ""}>
                          {mapping.dropdownSource}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-64 text-xs text-muted-foreground">
                      {mapping.notes?.startsWith("⚠️") ? (
                        <span className="text-warning flex items-start gap-1">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span>{mapping.notes.replace("⚠️ ", "")}</span>
                        </span>
                      ) : (
                        mapping.notes
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
