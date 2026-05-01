"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { ChevronDown, MoreVertical, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TablePageActionItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  destructive?: boolean;
}

export interface TablePageActionsProps {
  /**
   * Add action(s). When 1 entry → renders a single Add button.
   * When >1 entries → renders an Add dropdown with chevron on desktop.
   * On mobile the button is always icon-only (Plus).
   */
  addOptions?: TablePageActionItem[];
  /** Custom label shown next to the plus icon on desktop (default: "Add"). */
  addLabel?: string;
  /**
   * Items shown in the vertical 3-dot "More" menu. When omitted the menu is hidden.
   * Use this for secondary table actions (Import, Export, Bulk delete, etc).
   */
  moreOptions?: TablePageActionItem[];
  className?: string;
}

function renderItem(item: TablePageActionItem, key: string): ReactNode {
  return (
    <DropdownMenuItem
      key={key}
      disabled={item.disabled}
      onClick={item.onClick}
      className={cn(item.destructive && "text-destructive focus:text-destructive")}
    >
      {item.icon ? <span className="mr-2 flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
      {item.label}
    </DropdownMenuItem>
  );
}

/**
 * Standard table-page header actions: an Add button (icon-only on mobile, icon+label
 * on desktop) and an optional vertical 3-dot menu for secondary actions.
 *
 * Use this in `UnifiedTablePage`'s `header.actions` slot on EVERY table page so
 * client-driven changes only have to be made in one place.
 *
 * @example
 * <UnifiedTablePage
 *   header={{
 *     title: "Companies",
 *     actions: (
 *       <TablePageActions
 *         addOptions={[
 *           { label: "Add New Company", icon: <Building2 />, onClick: handleAdd },
 *           { label: "Import from CSV", icon: <FileSpreadsheet />, onClick: handleImport },
 *         ]}
 *         moreOptions={[
 *           { label: "Sync from ERP", icon: <RefreshCw />, onClick: handleSync },
 *         ]}
 *       />
 *     ),
 *   }}
 * />
 */
export function TablePageActions({
  addOptions,
  addLabel = "Add",
  moreOptions,
  className,
}: TablePageActionsProps): React.ReactElement | null {
  const hasAdd = Array.isArray(addOptions) && addOptions.length > 0;
  const hasMore = Array.isArray(moreOptions) && moreOptions.length > 0;
  if (!hasAdd && !hasMore) return null;

  const singleAdd = hasAdd && addOptions!.length === 1 ? addOptions![0] : null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {hasAdd && (
        singleAdd ? (
          <>
            {/* Mobile: icon-only */}
            <Button
              size="icon"
              variant="default"
              className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 sm:hidden"
              onClick={singleAdd.onClick}
              aria-label={singleAdd.label}
              disabled={singleAdd.disabled}
            >
              <Plus />
            </Button>
            {/* Desktop: icon + label */}
            <Button
              size="sm"
              variant="default"
              className="hidden sm:inline-flex bg-primary hover:bg-primary/90"
              onClick={singleAdd.onClick}
              disabled={singleAdd.disabled}
            >
              <Plus />
              {addLabel}
            </Button>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="default"
                className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 sm:hidden"
                aria-label={addLabel}
              >
                <Plus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {addOptions!.map((item, index) => renderItem(item, `add-mobile-${index}`))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
      {hasAdd && !singleAdd && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="default"
              className="hidden sm:inline-flex bg-primary hover:bg-primary/90"
            >
              <Plus />
              {addLabel}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {addOptions!.map((item, index) => renderItem(item, `add-desktop-${index}`))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {hasMore && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 sm:h-9 sm:w-9"
              aria-label="More actions"
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {moreOptions!.map((item, index) => {
              if (item.label === "---") {
                return <DropdownMenuSeparator key={`sep-${index}`} />;
              }
              return renderItem(item, `more-${index}`);
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
