"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ProjectCostCode } from "../types";

interface BudgetCodeSelectorProps {
  /** Available project cost codes to select from */
  projectCostCodes: ProjectCostCode[];
  /** Currently selected cost code label */
  selectedLabel: string;
  /** Callback when a cost code is selected */
  onSelect: (costCode: ProjectCostCode) => void;
  /** Callback when "Create New" is clicked */
  onCreateNew: () => void;
  /** Whether the popover is open (controlled) - IGNORED, using internal state */
  open?: boolean;
  /** Callback to control popover open state */
  onOpenChange?: (open: boolean) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom class name */
  className?: string;
}

export function BudgetCodeSelector({
  projectCostCodes,
  selectedLabel,
  onSelect,
  onCreateNew,
  onOpenChange,
  placeholder = "Select",
  className,
}: BudgetCodeSelectorProps) {
  // Use internal state for popover instead of controlled props
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set(),
  );

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    // Reset search when closing
    if (!newOpen) {
      setSearchQuery("");
    }
    // Notify parent if callback provided
    onOpenChange?.(newOpen);
  };

  const toggleDivision = (division: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(division)) {
        next.delete(division);
      } else {
        next.add(division);
      }
      return next;
    });
  };

  // Filter cost codes based on search query
  const filteredCostCodes = useMemo(() => {
    if (!searchQuery) return projectCostCodes;
    const query = searchQuery.toLowerCase();
    return projectCostCodes.filter((code) => {
      const costCodeTitle = code.cost_codes?.title || "";
      const costTypeCode = code.cost_code_types?.code || "";
      const costTypeDesc = code.cost_code_types?.description || "";
      return (
        code.cost_code_id.toLowerCase().includes(query) ||
        costCodeTitle.toLowerCase().includes(query) ||
        costTypeCode.toLowerCase().includes(query) ||
        costTypeDesc.toLowerCase().includes(query)
      );
    });
  }, [projectCostCodes, searchQuery]);

  // Group filtered cost codes by division
  const groupedCostCodes = useMemo(() => {
    return filteredCostCodes.reduce(
      (acc, code) => {
        const division = code.cost_codes?.division_title || "Other";
        if (!acc[division]) {
          acc[division] = [];
        }
        acc[division].push(code);
        return acc;
      },
      {} as Record<string, ProjectCostCode[]>,
    );
  }, [filteredCostCodes]);

  const sortedDivisions = Object.keys(groupedCostCodes).sort();

  const handleSelect = (code: ProjectCostCode) => {
    onSelect(code);
    handleOpenChange(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    handleOpenChange(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span
            className={cn(
              "truncate",
              selectedLabel ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-4 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search budget codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div className="max-h-[300px] overflow-y-auto">
            {sortedDivisions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No budget codes found.
              </div>
            ) : (
              sortedDivisions.map((division) => (
                <div key={division}>
                  {/* Division Header */}
                  <div
                    className="flex items-center w-full px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
                    onClick={(e) => toggleDivision(division, e)}
                  >
                    {expandedDivisions.has(division) ? (
                      <ChevronDown className="mr-2 h-4 w-4" />
                    ) : (
                      <ChevronRight className="mr-2 h-4 w-4" />
                    )}
                    {division}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({groupedCostCodes[division].length})
                    </span>
                  </div>

                  {/* Division Items */}
                  {expandedDivisions.has(division) &&
                    groupedCostCodes[division].map((code) => {
                      const costCodeTitle = code.cost_codes?.title || "";
                      const displayLabel = `${code.cost_code_id} – ${costCodeTitle}`;
                      const isSelected = selectedLabel === displayLabel;

                      return (
                        <div
                          key={code.id}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center pl-8 pr-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground",
                            isSelected && "bg-accent",
                          )}
                          onClick={() => handleSelect(code)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          {displayLabel}
                        </div>
                      );
                    })}
                </div>
              ))
            )}
          </div>

          {/* Create New Button */}
          <div className="border-t">
            <div
              className="flex items-center cursor-pointer px-4 py-2 text-sm text-primary hover:bg-accent"
              onClick={handleCreateNew}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Budget Code
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
