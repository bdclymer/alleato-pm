import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type" | "onFocus"> {
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  autoSelectOnFocus?: boolean;
  clearZeroOnFocus?: boolean;
  formatOnBlur?: boolean;
}

/**
 * Enhanced number input component designed for budget/financial data entry
 * Features:
 * - Auto-selects content on focus for easy replacement
 * - Clears placeholder zeros when user clicks
 * - Formats currency values on blur
 * - Optimized for fast data entry workflows
 */
function NumberInput({
  className,
  onFocus,
  autoSelectOnFocus = true,
  clearZeroOnFocus = true,
  formatOnBlur = true,
  onBlur,
  value,
  placeholder = "Enter amount",
  step = "0.01",
  ...props
}: NumberInputProps) {

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;

    if (autoSelectOnFocus) {
      // Select all text for easy replacement
      target.select();
    } else if (clearZeroOnFocus) {
      // Clear common placeholder values
      const val = target.value;
      if (val === "0" || val === "0.00" || val === "0.0") {
        target.value = "";
      }
    }

    // Call the original onFocus handler if provided
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (formatOnBlur && value) {
      const numValue = parseFloat(String(value));
      if (!isNaN(numValue)) {
        // Format to 2 decimal places if it's a valid number
        e.target.value = numValue.toFixed(2);
      }
    }

    // Call the original onBlur handler if provided
    onBlur?.(e);
  };

  return (
    <Input
      type="number"
      step={step}
      value={value}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        // Enhanced styling for better UX
        "tabular-nums text-right",
        "focus:ring-2 focus:ring-brand/20 focus:border-brand",
        "transition-all duration-200",
        // Ensure consistent height across all forms
        "h-10",
        className
      )}
      {...props}
    />
  )
}

export { NumberInput, type NumberInputProps }