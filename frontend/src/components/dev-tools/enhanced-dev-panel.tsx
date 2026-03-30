"use client"

import { useState, useEffect, useRef } from "react"
import {
  Code,
  ChevronUp,
  Database,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  FileCode,
  GitBranch,
  Network,
  AlertTriangle,
  Terminal,
  Table2,
  Link as LinkIcon,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"
import { useParams, usePathname } from "next/navigation"
import { toast } from "sonner"
import { DeveloperFormConfigPanel } from "@/components/project/developer-form-config-panel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface HealthCheck {
  name: string
  status: "pending" | "success" | "error"
  message?: string
  duration?: number
}

interface ConsoleError {
  message: string
  timestamp: number
  stack?: string
  type: "error" | "warning" | "info"
}

interface ApiCall {
  url: string
  method: string
  status: number
  duration: number
  timestamp: number
  error?: string
}

interface ColumnMappingRow {
  visibleColumnName: string
  actualColumnOrFormula: string
  notes: string
}

function serializeConsoleArg(arg: unknown): string {
  if (typeof arg === "string") return arg

  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`
  }

  if (arg instanceof HTMLElement) {
    const id = arg.id ? `#${arg.id}` : ""
    const classNames =
      typeof arg.className === "string" && arg.className.trim()
        ? `.${arg.className.trim().split(/\s+/).join(".")}`
        : ""
    return `<${arg.tagName.toLowerCase()}${id}${classNames}>`
  }

  try {
    const seen = new WeakSet<object>()
    return JSON.stringify(arg, (_key, value) => {
      if (typeof value === "function") {
        return `[Function ${value.name || "anonymous"}]`
      }
      if (value instanceof HTMLElement) {
        const id = value.id ? `#${value.id}` : ""
        return `<${value.tagName.toLowerCase()}${id}>`
      }
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]"
        seen.add(value)
      }
      return value
    })
  } catch {
    return String(arg)
  }
}

// FK Type Reference - from incident log
const FK_TYPE_REFERENCE = [
  { table: "projects", pk: "id: number", fk: "project_id INTEGER" },
  { table: "people", pk: "id: string (UUID)", fk: "person_id UUID" },
  { table: "vendors", pk: "id: string (UUID)", fk: "vendor_id UUID" },
  { table: "companies", pk: "id: string (UUID)", fk: "company_id UUID" },
  { table: "users", pk: "id: string (UUID)", fk: "user_id UUID" },
]

// Common CHECK constraint values from pattern docs
const CHECK_CONSTRAINT_VALUES = {
  subcontracts_status: ["Draft", "Sent", "Pending", "Approved", "Executed", "Closed", "Void"],
  direct_costs_status: ["Draft", "Approved", "Rejected", "Paid"],
  direct_costs_cost_type: ["Expense", "Invoice", "Subcontractor Invoice"],
  change_orders_status: ["draft", "pending", "approved", "rejected", "void"],
  companies_status: ["ACTIVE", "INACTIVE"],
}

const DATABASE_CATALOG_COLUMN_MAP: ColumnMappingRow[] = [
  {
    visibleColumnName: "Table Name",
    actualColumnOrFormula: "table_name",
    notes: "Physical table name in Postgres.",
  },
  {
    visibleColumnName: "Schema",
    actualColumnOrFormula: "schema_name",
    notes: "Schema containing the table.",
  },
  {
    visibleColumnName: "Category",
    actualColumnOrFormula: "category",
    notes: "Editable metadata field.",
  },
  {
    visibleColumnName: "Row Count",
    actualColumnOrFormula: "row_count",
    notes: "Estimated row count from catalog metadata.",
  },
  {
    visibleColumnName: "RLS Enabled",
    actualColumnOrFormula: "rls_enabled",
    notes: "Boolean rendered as enabled/disabled badge.",
  },
  {
    visibleColumnName: "Primary Keys",
    actualColumnOrFormula: "primary_keys",
    notes: "String summary of PK columns.",
  },
  {
    visibleColumnName: "Description",
    actualColumnOrFormula: "table_comment",
    notes: "Table comment/description.",
  },
  {
    visibleColumnName: "Created At",
    actualColumnOrFormula: "created_at",
    notes: "Timestamp of catalog row creation.",
  },
]

interface EnhancedDevPanelProps {
  variant?: "sidebar" | "footer"
}

export function EnhancedDevPanel({ variant = "sidebar" }: EnhancedDevPanelProps) {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [consoleErrors, setConsoleErrors] = useState<ConsoleError[]>([])
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([])
  const [routeConflicts, setRouteConflicts] = useState<string | null>(null)
  const [isCheckingRoutes, setIsCheckingRoutes] = useState(false)
  const [nextjsStatus, setNextjsStatus] = useState<"running" | "stopped" | "unknown">("unknown")
  const [isFooterOpen, setIsFooterOpen] = useState(false)
  const footerRef = useRef<HTMLDivElement>(null)
  const [columnMappings, setColumnMappings] = useState<ColumnMappingRow[]>([])
  const [detectedTableName, setDetectedTableName] = useState<string>("Unknown")
  const [detectedPrimaryId, setDetectedPrimaryId] = useState<string>("N/A")
  const params = useParams()
  const pathname = usePathname()
  const supabase = createClient()

  // Listen for console errors
  useEffect(() => {
    const originalError = console.error
    const originalWarn = console.warn

    console.error = (...args) => {
      originalError(...args)
      const message = args.map(serializeConsoleArg).join(" ")
      setConsoleErrors(prev => [
        { message, timestamp: Date.now(), type: "error" },
        ...prev.slice(0, 49), // Keep last 50
      ])
    }

    console.warn = (...args) => {
      originalWarn(...args)
      const message = args.map(serializeConsoleArg).join(" ")
      setConsoleErrors(prev => [
        { message, timestamp: Date.now(), type: "warning" },
        ...prev.slice(0, 49),
      ])
    }

    return () => {
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])

  useEffect(() => {
    if (variant !== "footer" || !isFooterOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(event.target as Node)) {
        setIsFooterOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [variant, isFooterOpen])

  useEffect(() => {
    const paramsEntries = Object.entries(params ?? {})
      .filter(([key, value]) => {
        if (!value) return false
        return key.toLowerCase().endsWith("id")
      })
      .map(([key, value]) => {
        const normalized = Array.isArray(value) ? value[0] : value
        return { key, value: String(normalized) }
      })

    const preferredPrimaryId =
      paramsEntries.find((entry) => entry.key.toLowerCase() === "recordid") ??
      paramsEntries.find((entry) => entry.key.toLowerCase() !== "projectid") ??
      paramsEntries[0]

    setDetectedPrimaryId(preferredPrimaryId ? `${preferredPrimaryId.key}: ${preferredPrimaryId.value}` : "N/A")

    if (pathname === "/database") {
      setDetectedTableName("database_tables_catalog")
      setColumnMappings(DATABASE_CATALOG_COLUMN_MAP)
      return
    }

    const adminTableMatch = pathname?.match(/^\/tables\/([^/]+)/)
    if (adminTableMatch?.[1]) {
      const tableName = decodeURIComponent(adminTableMatch[1])
      setDetectedTableName(tableName)
      setColumnMappings([])
      return
    }

    const pathSegments = pathname?.split("/").filter(Boolean) ?? []
    const lastSegment = pathSegments[pathSegments.length - 1]
    if (lastSegment && !lastSegment.toLowerCase().endsWith("id")) {
      setDetectedTableName(lastSegment.replaceAll("-", "_"))
    } else {
      setDetectedTableName("Unknown")
    }

    // Generic fallback: infer visible headers from the first table on screen.
    const inferredHeaders = Array.from(document.querySelectorAll("table thead th"))
      .map((element) => element.textContent?.trim() ?? "")
      .filter((text) => text.length > 0 && text !== "Select")

    setColumnMappings(
      inferredHeaders.map((header) => ({
        visibleColumnName: header,
        actualColumnOrFormula: header.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
        notes: "Inferred from visible header text. Verify in source columns config.",
      })),
    )
  }, [params, pathname, isFooterOpen])

  const runHealthChecks = async () => {
    setIsChecking(true)
    const checks: HealthCheck[] = [
      { name: "Database Connection", status: "pending" },
      { name: "Auth Service", status: "pending" },
      { name: "API Routes", status: "pending" },
      { name: "Supabase RLS", status: "pending" },
    ]
    setHealthChecks(checks)

    // Check 1: Database
    const dbStart = Date.now()
    try {
      const { error } = await supabase.from("projects").select("id").limit(1)
      checks[0] = {
        ...checks[0],
        status: error ? "error" : "success",
        message: error?.message || "Connected",
        duration: Date.now() - dbStart,
      }
    } catch (err) {
      checks[0] = {
        ...checks[0],
        status: "error",
        message: String(err),
        duration: Date.now() - dbStart,
      }
    }
    setHealthChecks([...checks])

    // Check 2: Auth
    const authStart = Date.now()
    try {
      const { data, error } = await supabase.auth.getSession()
      checks[1] = {
        ...checks[1],
        status: error ? "error" : "success",
        message: error?.message || (data.session ? "Authenticated" : "No session"),
        duration: Date.now() - authStart,
      }
    } catch (err) {
      checks[1] = {
        ...checks[1],
        status: "error",
        message: String(err),
        duration: Date.now() - authStart,
      }
    }
    setHealthChecks([...checks])

    // Check 3: API Routes (if projectId exists)
    if (params.projectId) {
      const apiStart = Date.now()
      try {
        const response = await fetch(`/api/projects/${params.projectId}/budget`)
        checks[2] = {
          ...checks[2],
          status: response.ok ? "success" : "error",
          message: response.ok ? `${response.status} OK` : `${response.status} ${response.statusText}`,
          duration: Date.now() - apiStart,
        }
      } catch (err) {
        checks[2] = {
          ...checks[2],
          status: "error",
          message: String(err),
          duration: Date.now() - apiStart,
        }
      }
      setHealthChecks([...checks])
    }

    // Check 4: RLS Policies
    const rlsStart = Date.now()
    try {
      // Try a simple query that would fail if RLS is blocking
      const { error } = await supabase.from("projects").select("id").limit(1)
      checks[3] = {
        ...checks[3],
        status: error ? "error" : "success",
        message: error?.message || "Policies OK",
        duration: Date.now() - rlsStart,
      }
    } catch (err) {
      checks[3] = {
        ...checks[3],
        status: "error",
        message: String(err),
        duration: Date.now() - rlsStart,
      }
    }
    setHealthChecks([...checks])

    setIsChecking(false)
  }

  const checkRouteConflicts = async () => {
    setIsCheckingRoutes(true)
    try {
      const response = await fetch("/api/dev-tools/check-routes")
      const data = await response.json()
      setRouteConflicts(data.conflicts || "✅ No route conflicts found")
    } catch (err) {
      setRouteConflicts(`Error checking routes: ${err}`)
    }
    setIsCheckingRoutes(false)
  }

  const clearNextjsCache = async () => {
    try {
      const response = await fetch("/api/dev-tools/clear-cache", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        toast.success("Next.js cache cleared. Refresh the page.")
      } else {
        toast.error(data.message || "Failed to clear cache")
      }
    } catch (err) {
      toast.error(`Error: ${err}`)
    }
  }

  const regenerateTypes = async () => {
    try {
      const response = await fetch("/api/dev-tools/regenerate-types", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        toast.success("Types regenerated successfully")
      } else {
        toast.error(data.message || "Failed to regenerate types")
      }
    } catch (err) {
      toast.error(`Error: ${err}`)
    }
  }

  const clearLocalStorage = () => {
    localStorage.clear()
    window.location.reload()
  }

  const getEnvInfo = () => ({
    node: process.env.NODE_ENV,
    nextPublicUrl: process.env.NEXT_PUBLIC_APP_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  const envInfo = getEnvInfo()
  const routeSegments = pathname?.split("/").filter(Boolean) ?? []
  const featureInsights = [
    {
      match: "submittals",
      label: "Submittals",
      tables: ["projects", "submittals", "submittal_comments", "submittal_reviewers"],
      endpoints: [
        (projectId?: string) => `/api/projects/${projectId}/submittals`,
        (projectId?: string) => `/api/projects/${projectId}/submittals/summary`,
        () => `/api/submittals/import`,
      ],
    },
    {
      match: "budget",
      label: "Budget",
      tables: ["projects", "budgets", "budget_lines", "cost_codes"],
      endpoints: [
        (projectId?: string) => `/api/projects/${projectId}/budget`,
        (projectId?: string) => `/api/projects/${projectId}/budget-lines`,
        () => `/api/budget/forecasts`,
      ],
    },
    {
      match: "tables-directory",
      label: "Tables Directory",
      tables: ["tables", "table_snapshots"],
      endpoints: [
        () => `/api/tables`,
        () => `/api/tables/schemas`,
      ],
    },
  ]
  const pageInsight = featureInsights.find((insight) =>
    routeSegments.some((segment) => insight.match === segment),
  )
  const errorCount = consoleErrors.filter(e => e.type === "error").length

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null

  const panelContent = (
    <Tabs defaultValue="column-map" className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="column-map">Column Map</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          <ScrollArea
            className={`${variant === "footer" ? "h-[min(70vh,640px)]" : "h-[calc(100vh-200px)]"} mt-4 pr-6`}
          >
            {/* COLUMN MAP TAB */}
            <TabsContent value="column-map" className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Table Being Displayed</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{detectedTableName}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">Primary ID</div>
                  <div className="mt-1 font-mono text-sm text-foreground">{detectedPrimaryId}</div>
                </div>
              </div>

              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Visible Column Name</TableHead>
                      <TableHead>Actual Column / Formula</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columnMappings.length > 0 ? (
                      columnMappings.map((row) => (
                        <TableRow key={`${row.visibleColumnName}-${row.actualColumnOrFormula}`}>
                          <TableCell className="align-top">{row.visibleColumnName}</TableCell>
                          <TableCell className="align-top font-mono text-xs">{row.actualColumnOrFormula}</TableCell>
                          <TableCell className="align-top text-xs text-muted-foreground">{row.notes}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-sm text-muted-foreground">
                          No visible table headers detected yet for this page.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">

              {/* Environment Info */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Environment
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <Badge variant={envInfo.node === "development" ? "default" : "secondary"}>
                      {envInfo.node}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">App URL:</span>
                    <code className="text-xs truncate">{envInfo.nextPublicUrl || "Not set"}</code>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Supabase:</span>
                    <code className="text-xs truncate max-w-[300px]">{envInfo.supabaseUrl}</code>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Current Route */}
              <div>
                <h3 className="font-semibold mb-4">Current Route</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Path:</span>
                    <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{pathname}</code>
                  </div>
                  {params.projectId && (
                    <div>
                      <span className="text-muted-foreground">Project ID:</span>
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{params.projectId}</code>
                    </div>
                  )}
              </div>
            </div>

            {pageInsight && (
              <>
                <Separator />
                {/* Page Insights */}
                <div>
                  <h3 className="font-semibold mb-4">Page Insights</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary" className="text-xs">
                        {pageInsight.label}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {routeSegments.join(" / ")}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Supabase tables</div>
                      <div className="flex flex-wrap gap-2">
                        {pageInsight.tables.map((table) => (
                          <Badge key={table} variant="outline" className="text-xs">
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Common API endpoints
                      </div>
                      <div className="space-y-1">
                        {pageInsight.endpoints.map((endpointFn, index) => (
                          <code
                            key={index}
                            className="text-xs bg-muted px-2 py-1 rounded block"
                          >
                            {endpointFn(Array.isArray(params.projectId) ? params.projectId[0] : params.projectId)}
                          </code>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!pageInsight && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Page Insights</h3>
                  <p className="text-xs text-muted-foreground">
                    No feature-specific insights available for this route.
                    Use the console or API tabs to gather more context.
                  </p>
                </div>
              </>
            )}

            <Separator />

            {/* Health Checks */}
            <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">System Health</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runHealthChecks}
                    disabled={isChecking}
                  >
                    {isChecking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    <span className="ml-2">Run Checks</span>
                  </Button>
                </div>

                {healthChecks.length > 0 ? (
                  <div className="space-y-2">
                    {healthChecks.map((check) => (
                      <div
                        key={check.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {check.status === "pending" && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {check.status === "success" && (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          )}
                          {check.status === "error" && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{check.name}</div>
                            {check.message && (
                              <div className="text-xs text-muted-foreground">{check.message}</div>
                            )}
                          </div>
                        </div>
                        {check.duration && (
                          <Badge variant="outline" className="text-xs">
                            {check.duration}ms
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Click "Run Checks" to test system health
                  </p>
                )}
              </div>

              <Separator />

              {/* Quick Actions */}
              <div>
                <h3 className="font-semibold mb-4">Quick Fixes</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={clearNextjsCache}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Next.js Cache (.next)
                    <Badge variant="destructive" className="ml-auto text-xs">
                      90+ min saved
                    </Badge>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={regenerateTypes}
                  >
                    <FileCode />
                    Regenerate Supabase Types
                    <Badge variant="secondary" className="ml-auto text-xs">
                      90+ min saved
                    </Badge>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={checkRouteConflicts}
                    disabled={isCheckingRoutes}
                  >
                    {isCheckingRoutes ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <GitBranch />
                    )}
                    Check Route Conflicts
                    <Badge variant="secondary" className="ml-auto text-xs">
                      60+ min saved
                    </Badge>
                  </Button>

                  {routeConflicts && (
                    <div className="text-xs bg-muted p-4 rounded-lg font-mono whitespace-pre-wrap">
                      {routeConflicts}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={clearLocalStorage}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Local Storage & Reload
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Quick Links */}
              <div>
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={`https://supabase.com/dashboard/project/${process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0].replace("https://", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink />
                      Open Supabase Dashboard
                    </a>
                  </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <a href="/.claude/rules" target="_blank">
                  <ExternalLink />
                  View Claude Rules
                </a>
              </Button>
            </div>
          </div>
          <DeveloperFormConfigPanel />
        </TabsContent>

            {/* DATABASE TAB */}
            <TabsContent value="database" className="space-y-4">
              {/* FK Type Reference */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  FK Type Reference
                  <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Common FK type mismatches (90+ min wasted on 3 incidents):
                  </p>
                  {FK_TYPE_REFERENCE.map((ref) => (
                    <div key={ref.table} className="text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-foreground font-semibold">{ref.table}</span>
                        <span className="text-muted-foreground">{ref.pk}</span>
                      </div>
                      <div className="text-success">
                        ✓ Use: {ref.fk}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* CHECK Constraints */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Table2 className="h-4 w-4" />
                  CHECK Constraint Values
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Case-sensitive! Use exact values:
                  </p>
                  {Object.entries(CHECK_CONSTRAINT_VALUES).map(([key, values]) => (
                    <div key={key} className="space-y-1">
                      <div className="text-xs font-semibold">{key.replace(/_/g, " ")}:</div>
                      <div className="flex flex-wrap gap-1">
                        {values.map((val) => (
                          <Badge key={val} variant="outline" className="text-xs">
                            {val}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Testing Pattern */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-sm">Test Queries Before Deploy</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  NEVER claim a query works without testing it:
                </p>
                <code className="text-xs bg-background px-4 py-2 rounded block whitespace-pre-wrap">
                  {`node -e '
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(url, key);
(async () => {
  const { data, error } = await supabase
    .from("table")
    .select("*, fk:other(col)")
    .limit(1);
  if (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
  console.log("✅ SUCCESS");
})();
'`}
                </code>
              </div>
            </TabsContent>

            {/* ERRORS TAB */}
            <TabsContent value="errors" className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  <strong>Common Pain Points:</strong> Next.js cache issues (90+ min wasted), Supabase FK type mismatches (90+ min), Route conflicts (60+ min)
                </AlertDescription>
              </Alert>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Console Errors</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConsoleErrors([])}
                >
                  Clear
                </Button>
              </div>

              {consoleErrors.length > 0 ? (
                <div className="space-y-2">
                  {consoleErrors.slice(0, 20).map((error, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-xs ${
                        error.type === "error"
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-warning/10 border border-warning/20"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={error.type === "error" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {error.type}
                        </Badge>
                        <span className="text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono whitespace-pre-wrap break-all">
                        {error.message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No errors logged</p>
              )}
            </TabsContent>

            {/* NETWORK TAB */}
            <TabsContent value="network" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">API Calls</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApiCalls([])}
                >
                  Clear
                </Button>
              </div>

              {apiCalls.length > 0 ? (
                <div className="space-y-2">
                  {apiCalls.slice(0, 20).map((call, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg text-xs bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={call.status >= 400 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {call.method} {call.status}
                        </Badge>
                        <span className="text-muted-foreground">
                          {call.duration}ms
                        </span>
                      </div>
                      <div className="font-mono break-all">
                        {call.url}
                      </div>
                      {call.error && (
                        <div className="text-red-500 mt-1">{call.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No API calls logged yet
                </p>
              )}
            </TabsContent>

          </ScrollArea>
    </Tabs>
  )

  if (variant === "footer") {
    return (
      <div ref={footerRef} className="relative">
        {/* eslint-disable-next-line design-system/no-design-violations -- footer dev tools toggle */}
        <button
          type="button"
          onClick={() => setIsFooterOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Developer Tools
          <ChevronUp className={`h-3 w-3 transition-transform ${isFooterOpen ? "" : "rotate-180"}`} />
          {errorCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {errorCount}
            </span>
          )}
        </button>
        {isFooterOpen ? (
          <div className="absolute bottom-full left-0 z-50 mb-1 w-[min(96vw,1500px)] rounded-md border border-border bg-popover p-5 shadow-sm">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Zap className="h-4 w-4" />
                Developer Tools
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Debugging info and quick actions based on common pain points
              </p>
            </div>
            {panelContent}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Code />
          {errorCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-2xs font-semibold text-white flex items-center justify-center">
              {errorCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="!w-[820px] sm:!w-[760px] max-w-[95vw] sm:max-w-none px-6 py-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Developer Tools
          </SheetTitle>
          <SheetDescription>
            Debugging info and quick actions based on common pain points
          </SheetDescription>
        </SheetHeader>
        {panelContent}
      </SheetContent>
    </Sheet>
  )
}
