"use client";

import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DivisionItem {
  id: string;
  label: string;
  description?: string | null;
}

export interface DivisionTreeProps<T extends DivisionItem> {
  /** Items grouped by division */
  groupedItems: Record<string, T[]>;
  /** Set of currently expanded division keys */
  expandedDivisions: Set<string>;
  /** Callback when a division is toggled */
  onToggleDivision: (division: string) => void;
  /** Callback when an item is selected */
  onSelectItem: (item: T) => void;
  /** Currently selected item ID (optional) */
  selectedId?: string;
  /** Custom render function for item content (optional) */
  renderItem?: (item: T) => React.ReactNode;
  /** Custom class for the container */
  className?: string;
  /** Whether to show item count in division headers */
  showCount?: boolean;
}

/**
 * A reusable collapsible tree component for displaying items grouped by division.
 * Used for cost code selectors and budget code pickers.
 */
export function DivisionTree<T extends DivisionItem>({
  groupedItems,
  expandedDivisions,
  onToggleDivision,
  onSelectItem,
  selectedId,
  renderItem,
  className,
  showCount = true,
}: DivisionTreeProps<T>) {
  const sortedDivisions = Object.keys(groupedItems).sort();

  if (sortedDivisions.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
        No items available
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border rounded-md max-h-[400px] overflow-y-auto",
        className,
      )}
    >
      {sortedDivisions.map((division) => (
        <div key={division} className="border-b last:border-b-0">
          <button
            type="button"
            onClick={() => onToggleDivision(division)}
            className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted transition-colors"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              {expandedDivisions.has(division) ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
              {division}
            </span>
            {showCount && (
              <span className="text-xs text-muted-foreground">
                ({groupedItems[division].length})
              </span>
            )}
          </button>

          {expandedDivisions.has(division) && (
            <div className="bg-muted/50">
              {groupedItems[division].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={cn(
                    "w-full text-left px-6 py-2 text-sm hover:bg-muted transition-colors",
                    selectedId === item.id
                      ? "bg-info/10 text-info font-medium"
                      : "text-foreground",
                  )}
                >
                  {renderItem ? renderItem(item) : item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Helper function to toggle a division in the expanded set
 */
export function toggleDivisionInSet(
  expandedDivisions: Set<string>,
  division: string,
): Set<string> {
  const next = new Set(expandedDivisions);
  if (next.has(division)) {
    next.delete(division);
  } else {
    next.add(division);
  }
  return next;
}
