import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

interface BudgetFormFieldProps {
  label: string
  required?: boolean
  error?: string
  success?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

/**
 * Standardized form field wrapper for budget forms
 * Provides consistent styling, validation states, and accessibility
 */
function BudgetFormField({
  label,
  required = false,
  error,
  success,
  hint,
  className,
  children,
}: BudgetFormFieldProps) {
  const fieldId = React.useId()

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <Label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium flex items-center gap-1",
          error ? "text-destructive" : success ? "text-success" : "text-foreground"
        )}
      >
        {label}
        {required && (
          <span className="text-destructive text-xs" aria-label="required">
            *
          </span>
        )}
      </Label>

      {/* Input Field */}
      <div className="relative">
        {React.isValidElement(children) ?
          React.cloneElement(children as React.ReactElement<any>, {
            'aria-describedby': cn(
              error && `${fieldId}-error`,
              success && `${fieldId}-success`,
              hint && `${fieldId}-hint`
            ).trim() || undefined,
            'aria-invalid': !!error,
            className: cn(
              (children as React.ReactElement<any>).props.className,
              error && "border-destructive focus:border-destructive focus:ring-destructive/20",
              success && "border-success focus:border-success focus:ring-success/20"
            )
          }) : children
        }
      </div>

      {/* Feedback Messages */}
      <div className="space-y-1">
        {/* Error Message */}
        {error && (
          <div
            id={`${fieldId}-error`}
            className="flex items-center gap-2 text-xs text-destructive"
            role="alert"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && !error && (
          <div
            id={`${fieldId}-success`}
            className="flex items-center gap-2 text-xs text-success"
          >
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Hint Text */}
        {hint && !error && !success && (
          <div
            id={`${fieldId}-hint`}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Info className="h-3 w-3 shrink-0" />
            <span>{hint}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export { BudgetFormField }