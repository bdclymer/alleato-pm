"use client";

import * as React from "react";
import { ChevronDown, FileText, Plus, ArrowUpFromLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PortfolioView } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface PortfolioHeaderProps {
  views: PortfolioView[];
  financialViews: PortfolioView[];
  activeView: string;
  onViewChange: (viewId: string) => void;
  onSettingsClick?: () => void;
  onExport?: (format: "pdf" | "csv") => void;
  onCreateProject?: () => void;
  onCreateTestProject?: () => void;
}

export function PortfolioHeader({
  views,
  financialViews,
  activeView,
  onViewChange,
  onSettingsClick,
  onExport,
  onCreateProject,
  onCreateTestProject,
}: PortfolioHeaderProps) {
  return (
    <div>
      {/* Title row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground">Manage all your construction projects</p>
        </div>
      </div>

      {/* View tabs - Hidden on mobile */}
      <div className="hidden sm:flex sm:items-center sm:justify-between gap-4 pb-0 bg-background">
        <nav
          className="-mb-px flex space-x-6 overflow-x-auto border-b border-border/60"
          aria-label="Portfolio tabs"
        >
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => onViewChange(view.id)}
              className={cn(
                "group inline-flex items-center gap-2 border-b-2 py-4 px-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                activeView === view.id
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground",
              )}
              aria-current={activeView === view.id ? "page" : undefined}
            >
              <span>{view.name}</span>
            </button>
          ))}

          {/* Financial Views dropdown */}
          {financialViews.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "group inline-flex items-center gap-2 border-b-2 py-4 px-2 text-sm font-medium transition-all duration-200 whitespace-nowrap",
                    financialViews.some((v) => v.id === activeView)
                      ? "border-brand text-brand"
                      : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                  )}
                >
                  <span>Financial Views</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {financialViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    onClick={() => onViewChange(view.id)}
                    className={activeView === view.id ? "bg-accent" : ""}
                  >
                    {view.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Export and Create Project buttons - Desktop */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {onSettingsClick && (
          <Button
            onClick={onSettingsClick}
            variant="outline"
            className="h-9 text-sm px-4"
          >
            <FileText className="w-4 h-4 mr-2" />
            Settings
          </Button>
        )}

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
                type="button"
                className="p-2.5 hover:bg-muted rounded-md transition-all duration-200 hover:scale-105 border border-border"
                title="Export"
                aria-label="Export"
              >
                <ArrowUpFromLine className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport?.("pdf")}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.("csv")}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Test Project button (dev/testing only) */}
          {process.env.NODE_ENV === "development" && onCreateTestProject && (
            <Button
              onClick={onCreateTestProject}
              variant="outline"
              className="h-9 text-sm px-4 border-green-500 text-green-600 hover:bg-green-50"
              title="Create fully populated test project"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Test Project
            </Button>
          )}

          {/* Create Project button */}
          <Button
            onClick={onCreateProject}
            className="bg-brand text-white hover:bg-brand/90 h-9 text-sm px-4 shadow-sm hover:shadow transition-all duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      </div>
    </div>
  );
}
