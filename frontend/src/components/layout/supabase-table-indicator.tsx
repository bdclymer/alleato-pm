"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { Database, Table, Link2, X, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// Map routes to their associated Supabase tables
const routeTableMap: Record<string, string[]> = {
  // Project Management
  "home": ["projects", "project_users", "project_activity"],
  "projects": ["projects", "project_users"],
  "directory": ["companies", "contacts", "employees", "users"],
  "companies": ["companies", "company_contacts"],
  "contacts": ["contacts", "companies"],
  "employees": ["employees", "users"],

  // Financial Management
  "budget": ["budget_line_items", "budget_codes", "cost_codes", "budget_snapshots"],
  "budget-v2": ["budget_line_items", "budget_codes", "cost_codes"],
  "prime-contracts": ["prime_contracts", "contract_line_items"],
  "commitments": ["commitments", "commitment_line_items", "companies"],
  "change-orders": ["change_orders", "change_order_line_items"],
  "change-events": ["change_events", "change_event_line_items"],
  "direct-costs": ["direct_costs", "cost_codes", "employees"],
  "invoices": ["invoices", "invoice_line_items", "companies"],

  // Project Tools
  "rfis": ["rfis", "rfi_responses", "users"],
  "submittals": ["submittals", "submittal_items", "submittal_responses"],
  "punch-list": ["punch_items", "punch_item_assignees"],
  "daily-log": ["daily_logs", "daily_log_entries", "weather_conditions"],
  "meetings": ["meetings", "meeting_attendees", "meeting_items"],
  "schedule": ["schedule_tasks", "schedule_milestones"],
  "photos": ["photos", "photo_albums", "photo_tags"],
  "drawings": ["drawings", "drawing_revisions", "drawing_sets"],
  "specifications": ["specifications", "specification_sections"],
  "documents": ["documents", "document_folders", "document_versions"],
  "emails": ["emails", "email_attachments", "email_recipients"],
  "transmittals": ["transmittals", "transmittal_items"],
  "tasks": ["tasks", "task_assignees", "task_comments"],

  // Settings & Admin
  "settings": ["project_settings", "user_preferences"],
  "admin": ["audit_logs", "permissions", "roles"],
  "tables-directory": ["*"], // Special indicator for all tables
};

// Additional table relationships (foreign keys)
const tableRelationships: Record<string, string[]> = {
  "budget_line_items": ["projects", "cost_codes"],
  "commitments": ["projects", "companies"],
  "change_orders": ["projects", "commitments"],
  "rfis": ["projects", "users"],
  "submittals": ["projects", "specifications"],
  "punch_items": ["projects", "locations", "users"],
  "daily_logs": ["projects", "users"],
  "meetings": ["projects"],
  "photos": ["projects", "users"],
  "documents": ["projects", "users"],
};

export function SupabaseTableIndicator() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Load visibility state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("supabase-indicator-visible");
    const minimized = localStorage.getItem("supabase-indicator-minimized");
    setIsVisible(stored === "true" || stored === null); // Default to visible
    setIsMinimized(minimized === "true");
  }, []);

  // Save visibility state to localStorage
  const toggleVisibility = () => {
    const newValue = !isVisible;
    setIsVisible(newValue);
    localStorage.setItem("supabase-indicator-visible", String(newValue));
  };

  const toggleMinimized = () => {
    const newValue = !isMinimized;
    setIsMinimized(newValue);
    localStorage.setItem("supabase-indicator-minimized", String(newValue));
  };

  const { primaryTables, relatedTables } = useMemo(() => {
    if (!pathname) return { primaryTables: [], relatedTables: [] };

    // Extract the main route segment
    const segments = pathname.split("/").filter(Boolean);

    // Skip project ID if it's numeric
    const routeSegments = segments[0]?.match(/^\d+$/)
      ? segments.slice(1)
      : segments;

    const mainRoute = routeSegments[0] || "";

    // Get primary tables for this route
    const primary = routeTableMap[mainRoute] || [];

    // Get related tables through foreign keys
    const related = new Set<string>();
    primary.forEach(table => {
      const relations = tableRelationships[table] || [];
      relations.forEach(rel => related.add(rel));
    });

    // Remove primary tables from related to avoid duplication
    primary.forEach(table => related.delete(table));

    return {
      primaryTables: primary,
      relatedTables: Array.from(related),
    };
  }, [pathname]);

  // Show/hide toggle button when indicator is hidden
  if (!isVisible) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={toggleVisibility}
              size="icon"
              variant="outline"
              className="fixed bottom-2 left-2 z-50 h-8 w-8"
            >
              <Database className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Show Supabase table indicator</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (primaryTables.length === 0 && relatedTables.length === 0) {
    return null;
  }

  const isAllTables = primaryTables.includes("*");

  // Minimized view
  if (isMinimized) {
    return (
      <TooltipProvider>
        <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center p-1 bg-background/95 backdrop-blur-sm border-t shadow-lg">
          <div className="flex items-center gap-2 px-3">
            <Button
              onClick={toggleMinimized}
              size="icon"
              variant="ghost"
              className="h-6 w-6"
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {primaryTables.length} table{primaryTables.length !== 1 ? "s" : ""}
                  </span>
                  {relatedTables.length > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">+</span>
                      <span className="text-xs text-muted-foreground">
                        {relatedTables.length} related
                      </span>
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Primary: {primaryTables.join(", ")}</p>
                  {relatedTables.length > 0 && (
                    <p>Related: {relatedTables.join(", ")}</p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={toggleVisibility}
              size="icon"
              variant="ghost"
              className="h-6 w-6 ml-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Supabase Tables:</span>
            </div>

            {/* Table Badges */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {isAllTables ? (
                <Badge variant="secondary" className="text-xs">
                  All Tables
                </Badge>
              ) : (
                <>
                  {/* Primary Tables */}
                  <div className="flex items-center gap-1 flex-wrap">
                    {primaryTables.map((table) => (
                      <Tooltip key={table}>
                        <TooltipTrigger>
                          <Badge
                            variant="default"
                            className="text-xs bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                          >
                            <Table className="h-3 w-3 mr-1" />
                            {table}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Primary table for this page</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  {/* Related Tables */}
                  {relatedTables.length > 0 && (
                    <>
                      <div className="w-px h-4 bg-border" />
                      <div className="flex items-center gap-1 flex-wrap">
                        {relatedTables.map((table) => (
                          <Tooltip key={table}>
                            <TooltipTrigger>
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                {table}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Related through foreign keys</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Connection Status */}
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Connected</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Project: lgveqfnpkxvzbnnwuled</p>
                    <p>Region: us-west-1</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-border" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleMinimized}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                  >
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Minimize indicator</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleVisibility}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Hide indicator</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}