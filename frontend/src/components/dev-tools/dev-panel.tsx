"use client"

import { useState, useEffect } from "react"
import { Code, Database, Zap, RefreshCw, ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { useParams, usePathname } from "next/navigation"

interface HealthCheck {
  name: string
  status: "pending" | "success" | "error"
  message?: string
  duration?: number
}

export function DevPanel() {
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const params = useParams()
  const pathname = usePathname()
  const supabase = createClient()

  // Only show in development
  if (process.env.NODE_ENV !== "development") return null

  const runHealthChecks = async () => {
    setIsChecking(true)
    const checks: HealthCheck[] = [
      { name: "Database Connection", status: "pending" },
      { name: "Auth Service", status: "pending" },
      { name: "API Routes", status: "pending" },
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

    setIsChecking(false)
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Code className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Developer Tools
          </SheetTitle>
          <SheetDescription>
            Debugging info and quick actions for development
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <div className="space-y-6 py-6">
            {/* Environment Info */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">App URL:</span>
                  <code className="text-xs">{envInfo.nextPublicUrl || "Not set"}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supabase:</span>
                  <code className="text-xs truncate max-w-[200px]">{envInfo.supabaseUrl}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anon Key:</span>
                  <span>{envInfo.hasAnonKey ? "✓ Set" : "✗ Missing"}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Current Route */}
            <div>
              <h3 className="font-semibold mb-3">Current Route</h3>
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

            <Separator />

            {/* Health Checks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Health Checks</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runHealthChecks}
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
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
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        )}
                        {check.status === "error" && (
                          <XCircle className="h-4 w-4 text-red-500" />
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
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={clearLocalStorage}
                >
                  Clear Local Storage & Reload
                </Button>
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
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Supabase Dashboard
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="/api" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View API Routes
                  </a>
                </Button>
              </div>
            </div>

            <Separator />

            {/* Type Generation Reminder */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm">Type Generation</h3>
              <p className="text-xs text-muted-foreground mb-3">
                If you're getting TypeScript errors with Supabase types:
              </p>
              <code className="text-xs bg-background px-3 py-2 rounded block">
                npm run db:types
              </code>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
