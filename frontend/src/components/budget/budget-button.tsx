import * as React from "react"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"

interface BudgetButtonProps extends ButtonProps {
  intent?: "primary" | "secondary" | "danger" | "ghost"
}

/**
 * Standardized button component for budget-related actions
 * Ensures consistent styling across all budget components
 */
function BudgetButton({
  children,
  className,
  intent = "secondary",
  disabled,
  ...props
}: BudgetButtonProps) {
  const baseStyles = "font-medium transition-all duration-200 focus:ring-2 focus:ring-offset-2"

  const intentStyles = {
    primary: cn(
      "bg-brand text-white hover:bg-brand/90 focus:ring-brand/50",
      "disabled:bg-brand/50 disabled:text-white/70"
    ),
    secondary: cn(
      "border border-border bg-background hover:bg-muted text-foreground",
      "focus:ring-brand/30 disabled:bg-muted/50 disabled:text-muted-foreground"
    ),
    danger: cn(
      "bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive/50",
      "disabled:bg-destructive/50 disabled:text-white/70"
    ),
    ghost: cn(
      "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground",
      "focus:ring-brand/30 disabled:text-muted-foreground/50"
    )
  }

  return (
    <Button
      className={cn(
        baseStyles,
        intentStyles[intent],
        // Ensure consistent height
        "h-10",
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  )
}

export { BudgetButton, type BudgetButtonProps }