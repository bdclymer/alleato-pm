import * as React from "react";
import { Edit2, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ExtraAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface DetailActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  /** Additional actions rendered in the overflow menu */
  extraActions?: ExtraAction[];
  className?: string;
}

/**
 * DetailActions — standardized action icon row for detail page headers.
 *
 * Renders edit and share as icon buttons, collapses delete + extras into a
 * "More" overflow dropdown to keep the header tight.
 *
 * Usage:
 *   <DetailActions onEdit={...} onDelete={...} />
 */
export function DetailActions({ onEdit, onDelete, onShare, extraActions, className }: DetailActionsProps) {
  const hasOverflow = onDelete || (extraActions && extraActions.length > 0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onShare && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onShare}
          aria-label="Share"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      )}

      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Edit"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      )}

      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="More actions"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {extraActions?.map((action) => (
              <DropdownMenuItem
                key={action.label}
                onClick={action.onClick}
                className={action.destructive ? "text-destructive focus:text-destructive" : undefined}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
            {extraActions && extraActions.length > 0 && onDelete && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
