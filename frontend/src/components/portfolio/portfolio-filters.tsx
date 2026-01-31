"use client";

import * as React from "react";
import {
  Search,
  List,
  LayoutGrid,
  BarChart3,
  Map as MapIcon,
  X,
  SlidersHorizontal,
  ChevronDown,
  FileText,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PortfolioViewType } from "@/types/portfolio";
import { cn } from "@/lib/utils";

interface PortfolioFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewType: PortfolioViewType;
  onViewTypeChange: (type: PortfolioViewType) => void;
  onClearFilters?: () => void;
  // Primary filter (phase for projects, stage for other pages)
  phaseFilter?: string | null;
  onPhaseFilterChange?: (value: string | null) => void;
  phaseOptions?: string[];
  // Secondary filter (category for projects, type for other pages)
  categoryFilter?: string | null;
  onCategoryFilterChange?: (value: string | null) => void;
  categoryOptions?: string[];
  // Tertiary filter (client for projects)
  clientFilter?: string | null;
  onClientFilterChange?: (value: string | null) => void;
  clientOptions?: string[];
  // Action buttons for mobile
  onExport?: (format: "pdf" | "csv") => void;
  onCreateProject?: () => void;
  // Legacy props for backwards compatibility
  statusFilter?: any;
  onStatusFilterChange?: (value: any) => void;
  stageFilter?: string | null;
  onStageFilterChange?: (value: string | null) => void;
  stageOptions?: string[];
  stageLabel?: string;
  typeFilter?: string | null;
  onTypeFilterChange?: (value: string | null) => void;
  typeOptions?: string[];
  typeLabel?: string;
  hideViewToggle?: boolean;
}

export function PortfolioFilters({
  searchQuery,
  onSearchChange,
  viewType,
  onViewTypeChange,
  onClearFilters,
  phaseFilter,
  onPhaseFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  clientFilter,
  onClientFilterChange,
  phaseOptions,
  categoryOptions,
  clientOptions,
  onExport,
  onCreateProject,
  hideViewToggle = false,
}: PortfolioFiltersProps) {
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);

  const viewTypes: {
    value: PortfolioViewType;
    icon: React.ElementType;
    label: string;
  }[] = [
    { value: "list", icon: List, label: "List View" },
    { value: "thumbnails", icon: LayoutGrid, label: "Thumbnails View" },
    { value: "overview", icon: BarChart3, label: "Overview" },
    { value: "map", icon: MapIcon, label: "Map View" },
  ];

  const activeFiltersCount = [phaseFilter, categoryFilter, clientFilter].filter(
    (value) => value && value.length > 0,
  ).length;

  return (
    <div className="flex items-center justify-between py-4 gap-3">
      {/* Mobile: Compact layout with filter sheet */}
      <div className="flex lg:hidden items-center gap-2 flex-1">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm"
          />
        </div>

        {/* Filter Sheet Trigger */}
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="relative h-10 shrink-0 px-3 border-border hover:border-border/80"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Filters & Views</SheetTitle>
              <SheetDescription>
                Filter projects and change view type
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* View Type Selection */}
              {!hideViewToggle && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    View Type
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {viewTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          type="button"
                          key={type.value}
                          onClick={() => {
                            onViewTypeChange(type.value);
                          }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                            viewType === type.value
                              ? "border-brand bg-brand/5 text-brand"
                              : "border-border text-foreground hover:border-border",
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm font-medium">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Client Filter */}
              {onClientFilterChange && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Client
                  </h3>
                  <div className="space-y-2">
                    {clientOptions?.map((client) => (
                      <button
                        type="button"
                        key={client}
                        onClick={() => {
                          onClientFilterChange(
                            client === clientFilter ? null : client,
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                          clientFilter === client
                            ? "border-brand bg-brand/5 text-brand font-medium"
                            : "border-border text-foreground hover:border-border",
                        )}
                      >
                        <span>{client}</span>
                        {clientFilter === client && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase Filter */}
              {onPhaseFilterChange && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Phase</h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => onPhaseFilterChange(null)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                        !phaseFilter
                          ? "border-brand bg-brand/5 text-brand font-medium"
                          : "border-border text-foreground hover:border-border",
                      )}
                    >
                      <span>All Phases</span>
                      {!phaseFilter && (
                        <div className="w-2 h-2 rounded-full bg-brand" />
                      )}
                    </button>
                    {phaseOptions?.map((phase) => (
                      <button
                        type="button"
                        key={phase}
                        onClick={() => onPhaseFilterChange(phase)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-all capitalize",
                          phaseFilter === phase
                            ? "border-brand bg-brand/5 text-brand font-medium"
                            : "border-border text-foreground hover:border-border",
                        )}
                      >
                        <span>{phase}</span>
                        {phaseFilter === phase && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Filter */}
              {onCategoryFilterChange && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    Category
                  </h3>
                  <div className="space-y-2">
                    {categoryOptions?.map((category) => (
                      <button
                        type="button"
                        key={category}
                        onClick={() => {
                          onCategoryFilterChange(
                            category === categoryFilter ? null : category,
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                          categoryFilter === category
                            ? "border-brand bg-brand/5 text-brand font-medium"
                            : "border-border text-foreground hover:border-border",
                        )}
                      >
                        <span>{category}</span>
                        {categoryFilter === category && (
                          <div className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    onClearFilters?.();
                    setFilterSheetOpen(false);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Export dropdown - Mobile */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-brand text-white hover:bg-brand/90 h-9 px-2 shrink-0">
                <FileText className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("pdf")}>
                Export to PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("csv")}>
                Export to CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Create Project - Mobile */}
        {onCreateProject && (
          <Button
            onClick={onCreateProject}
            className="bg-brand text-white hover:bg-brand/90 h-9 px-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Desktop: Full layout */}
      <div className="hidden lg:flex items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 w-80 h-10 border-border focus:border-brand"
          />
        </div>

        {/* Client Filter Select */}
        {onClientFilterChange && (
          <Select
            value={clientFilter || "all"}
            onValueChange={(value) =>
              onClientFilterChange(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="h-10 w-[180px] text-sm border-border focus:border-brand">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clientOptions?.map((client) => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Phase Filter Dropdown */}
        {onPhaseFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 text-sm capitalize border-border hover:border-border/80">
                {phaseFilter || "All Phases"}
                <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              <DropdownMenuItem onClick={() => onPhaseFilterChange(null)}>
                All Phases
              </DropdownMenuItem>
              {phaseOptions?.length && (
                <>
                  <DropdownMenuSeparator />
                  {phaseOptions.map((phase) => (
                    <DropdownMenuItem
                      key={phase}
                      onClick={() => onPhaseFilterChange(phase)}
                    >
                      <span className="capitalize">{phase}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Category Filter Dropdown */}
        {onCategoryFilterChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 text-sm border-border hover:border-border/80">
                {categoryFilter || "All Categories"}
                <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[12rem]">
              {categoryOptions?.length ? (
                categoryOptions.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => onCategoryFilterChange(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  No categories found
                </DropdownMenuItem>
              )}
              {categoryFilter && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCategoryFilterChange(null)}
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}


        {/* Clear all button */}
        {(activeFiltersCount > 0 || searchQuery) && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* View type toggles - Desktop only */}
      {!hideViewToggle && (
        <div className="hidden lg:flex items-center gap-1 border rounded-md p-0.5">
          {viewTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                type="button"
                key={type.value}
                onClick={() => onViewTypeChange(type.value)}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewType === type.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                title={type.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
