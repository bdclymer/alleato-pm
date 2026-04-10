"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { cn } from "@/lib/utils";

interface MoneyFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  label: string;
  /** Canonical value in dollars (number). undefined = empty, 0 = zero. */
  value?: number;
  onChange?: (value: number | undefined) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  currency?: string;
  showCurrency?: boolean;
  allowNegative?: boolean;
  /** Inline mode: renders just the input with $ prefix, no label/FormField wrapper.
   *  Use this for inline table editing where the label comes from the column header. */
  inline?: boolean;
}

/**
 * Standardized currency input following strict formatting rules:
 * - Storage: number in dollars (parent owns the value)
 * - Typing: raw numeric string, no formatting mid-keystroke
 * - Blur: formatted with Intl.NumberFormat (commas + 2 decimals)
 * - Focus: raw number for clean editing
 * - $ prefix: visual chrome, never part of the typed value
 * - Right-aligned numbers
 * - Max 2 decimal places enforced
 * - Paste-safe (strips $, commas, spaces)
 * - Empty = undefined (not zero)
 */
export function MoneyField({
  label,
  value,
  onChange,
  error,
  hint,
  required = false,
  fullWidth = false,
  currency = "USD",
  showCurrency = true,
  allowNegative = false,
  inline = false,
  className,
  ...inputProps
}: MoneyFieldProps) {
  const inputId =
    inputProps.id ??
    `money-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const [displayValue, setDisplayValue] = React.useState<string>("");
  const isFocusedRef = React.useRef(false);

  // ── Formatting helpers ──────────────────────────────────────────────

  /** Display format: commas + 2 fixed decimals (blur / read-only) */
  const formatForDisplay = (val: number): string => {
    return val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  /** Strip a raw string down to only valid numeric characters */
  const sanitize = (raw: string): string => {
    const allowed = allowNegative ? /[^0-9.\-]/g : /[^0-9.]/g;
    let cleaned = raw.replace(allowed, "");

    // Only allow one decimal point
    const dotIndex = cleaned.indexOf(".");
    if (dotIndex !== -1) {
      const before = cleaned.slice(0, dotIndex + 1);
      const after = cleaned.slice(dotIndex + 1).replace(/\./g, "");
      // Enforce max 2 decimal places
      cleaned = before + after.slice(0, 2);
    }

    // Only allow leading negative sign
    if (allowNegative && cleaned.includes("-")) {
      const negative = cleaned.startsWith("-");
      cleaned = cleaned.replace(/-/g, "");
      if (negative) cleaned = "-" + cleaned;
    }

    return cleaned;
  };

  // ── Sync display from prop (only when NOT focused) ──────────────────

  React.useEffect(() => {
    if (isFocusedRef.current) return;
    if (value !== undefined) {
      setDisplayValue(formatForDisplay(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  // ── Event handlers ──────────────────────────────────────────────────

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = sanitize(e.target.value);

    if (cleaned === "" || cleaned === "-") {
      setDisplayValue(cleaned);
      onChange?.(undefined);
      return;
    }

    // Let the user type a trailing dot or trailing zeros after dot
    // e.g. "12." or "12.0" — don't parse yet, just store the string
    if (cleaned.endsWith(".") || /\.\d{0,2}0*$/.test(cleaned)) {
      const numVal = parseFloat(cleaned);
      setDisplayValue(cleaned);
      if (!isNaN(numVal)) onChange?.(numVal);
      return;
    }

    const numVal = parseFloat(cleaned);
    if (!isNaN(numVal)) {
      setDisplayValue(cleaned);
      onChange?.(numVal);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Format with commas and decimals on blur
    if (value !== undefined) {
      setDisplayValue(formatForDisplay(value));
    } else {
      setDisplayValue("");
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    // Switch to raw number for clean editing
    if (value !== undefined) {
      setDisplayValue(value.toString());
    }
    // Select all text for quick replacement
    requestAnimationFrame(() => e.target.select());
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Strip $, commas, spaces, currency codes — keep digits, dot, minus
    const cleaned = sanitize(pasted.replace(/[$,\s]/g, "").replace(/[A-Za-z]/g, ""));

    if (cleaned === "") {
      setDisplayValue("");
      onChange?.(undefined);
      return;
    }

    const numVal = parseFloat(cleaned);
    if (!isNaN(numVal)) {
      setDisplayValue(cleaned);
      onChange?.(numVal);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  const inputElement = (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
        $
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onPaste={handlePaste}
        className={cn(
          "pl-8 text-right",
          showCurrency && !inline && currency === "USD" && "pr-12",
          error && "border-destructive",
          className,
        )}
        placeholder=""
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        id={inputId}
        aria-label={label}
        {...inputProps}
      />
      {showCurrency && !inline && currency === "USD" && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          USD
        </span>
      )}
    </div>
  );

  if (inline) return inputElement;

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      fullWidth={fullWidth}
    >
      {inputElement}
    </FormField>
  );
}
