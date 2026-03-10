import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  align?: "start" | "end" | "between";
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
  children,
}: FormActionsProps) {
  const justifyClass =
    align === "start"
      ? "justify-start"
      : align === "between"
        ? "justify-between"
        : "justify-end";

  return (
    <div className={`flex items-center ${justifyClass} gap-4 border-t pt-6`}>
      {align === "between" ? <div>{children}</div> : null}

      <div className="flex items-center gap-4">
        {align !== "between" ? children : null}

        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={cancelDisabled || isSubmitting}
          >
            {cancelLabel}
          </Button>
        ) : null}

        <Button type="submit" disabled={submitDisabled || isSubmitting}>
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