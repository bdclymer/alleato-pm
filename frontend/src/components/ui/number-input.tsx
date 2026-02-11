import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type" | "onFocus"> {
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  autoSelectOnFocus?: boolean;
  clearZeroOnFocus?: boolean;
  formatOnBlur?: boolean;
  currency?: boolean;
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
  currency = false,
  onBlur,
  value,
  placeholder = "Enter amount",
  step = "0.01",
  ...props
}: NumberInputProps) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState<string>(
    value === undefined || value === null ? "" : String(value),
  );

  const stripToNumeric = React.useCallback((raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const [whole, ...rest] = cleaned.split(".");
    if (rest.length === 0) return whole;
    return `${whole}.${rest.join("").slice(0, 2)}`;
  }, []);

  const formatCurrency = React.useCallback((raw: string) => {
    if (!raw) return "";
    const numeric = Number.parseFloat(raw);
    if (Number.isNaN(numeric)) return raw;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numeric);
  }, []);

  React.useEffect(() => {
    if (!currency) return;
    const next = value === undefined || value === null ? "" : String(value);
    if (isFocused) {
      setDisplayValue(stripToNumeric(next));
    } else {
      setDisplayValue(formatCurrency(stripToNumeric(next)));
    }
  }, [currency, formatCurrency, isFocused, stripToNumeric, value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (currency) {
      setIsFocused(true);
      const raw = stripToNumeric(target.value);
      setDisplayValue(raw);
      target.value = raw;
    }

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
    if (currency) {
      const raw = stripToNumeric(e.target.value);
      setIsFocused(false);
      if (formatOnBlur) {
        const formatted = formatCurrency(raw);
        setDisplayValue(formatted);
        e.target.value = formatted;
      } else {
        setDisplayValue(raw);
        e.target.value = raw;
      }
    }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currency) {
      props.onChange?.(e);
      return;
    }

    const raw = stripToNumeric(e.target.value);
    setDisplayValue(raw);
    const nextEvent = {
      ...e,
      target: { ...e.target, value: raw },
      currentTarget: { ...e.currentTarget, value: raw },
    } as React.ChangeEvent<HTMLInputElement>;
    props.onChange?.(nextEvent);
  };

  return (
    <Input
      type={currency ? "text" : "number"}
      inputMode={currency ? "decimal" : undefined}
      step={step}
      value={currency ? displayValue : value}
      placeholder={placeholder}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={cn(
        // Enhanced styling for better UX
        "tabular-nums text-right !bg-transparent",
        "focus:ring-2 focus:ring-brand/20 focus:border-brand",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  )
}

export { NumberInput, type NumberInputProps }
