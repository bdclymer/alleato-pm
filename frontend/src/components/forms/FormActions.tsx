import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormActionsProps {
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  align?: "start" | "end" | "between";
  stickyOnMobile?: boolean;
  children?: React.ReactNode;
}

export function FormActions({
  submitLabel,
  cancelLabel = "Cancel",
  onCancel,
  isSubmitting = false,
  submitDisabled = false,
  cancelDisabled = false,
  align = "end",
  stickyOnMobile = true,
  children,
}: FormActionsProps) {
  const justifyClass =
    align === "start"
      ? "sm:justify-start"
      : align === "between"
        ? "sm:justify-between"
        : "sm:justify-end";

  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-t sm:flex-row sm:items-center",
        justifyClass,
        stickyOnMobile
          ? "sticky bottom-0 z-20 -mx-4 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-6 sm:backdrop-blur-none"
          : "pt-6",
      )}
    >
      {children ? <div className="w-full sm:w-auto">{children}</div> : null}

      <div
        className={cn(
          "flex w-full flex-col-reverse gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4",
          align === "between" && "sm:ml-auto",
        )}
      >
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={cancelDisabled || isSubmitting}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
        ) : null}

        <Button
          type="submit"
          disabled={submitDisabled || isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}
