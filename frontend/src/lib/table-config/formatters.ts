import { format, formatDistanceToNow, isValid } from "date-fns";
import { parseDisplayDate } from "@/lib/date-utils";

/**
 * Format a number as currency (USD)
 */
export function formatCurrency(
  value: number | string | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Format a date value with a named style or a custom date-fns format string.
 *
 * Named styles:
 *   "short"   → "Apr 20, 2026"    (default)
 *   "long"    → "April 20, 2026"
 *   "numeric" → "04/20/2026"
 *   "relative"→ "2 days ago"
 *
 * Custom format string (date-fns tokens):
 *   e.g. "MMM d" → "Apr 20"
 *
 * Returns "--" for null/undefined/invalid dates.
 *
 * @example
 * formatDate(record.start_date)              // "Apr 20, 2026"
 * formatDate(record.start_date, "long")      // "April 20, 2026"
 * formatDate(record.start_date, "numeric")   // "04/20/2026"
 * formatDate(record.start_date, "relative")  // "2 days ago"
 * formatDate(record.start_date, "MMM d")     // "Apr 20"
 */
export function formatDate(
  value: string | Date | null | undefined,
  styleOrFormat: "short" | "long" | "numeric" | "relative" | (string & Record<never, never>) = "short",
): string {
  if (!value) return "--";
  // ISO date-only strings (YYYY-MM-DD) must be parsed as local midnight, not UTC.
  // new Date("YYYY-MM-DD") and parseISO in date-fns v4 both treat them as UTC,
  // which shifts the displayed date by -1 day in US timezones.
  const date =
    typeof value === "string"
      ? /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(value + "T00:00:00")
        : parseISO(value)
      : value;
  if (!isValid(date)) {
    const fallback = typeof value === "string" ? new Date(value) : value;
    if (!isValid(fallback)) return "--";
    return _applyStyle(fallback, styleOrFormat);
  }
  return _applyStyle(date, styleOrFormat);
}

function _applyStyle(date: Date, styleOrFormat: string): string {
  try {
    switch (styleOrFormat) {
      case "short":   return format(date, "MMM d, yyyy");
      case "long":    return format(date, "MMMM d, yyyy");
      case "numeric": return format(date, "MM/dd/yyyy");
      case "relative": return formatDistanceToNow(date, { addSuffix: true });
      default:        return format(date, styleOrFormat);
    }
  } catch {
    return "--";
  }
}

/**
 * Format a number with optional decimal places
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a number as percentage
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1,
): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return `${num.toFixed(decimals)}%`;
}

/**
 * Format an array as comma-separated string
 */
export function formatArray(value: string[] | null | undefined): string {
  if (!value || !Array.isArray(value) || value.length === 0) return "-";
  return value.join(", ");
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(
  value: string | null | undefined,
  maxLength: number = 50,
): string {
  if (!value) return "-";
  if (value.length <= maxLength) return value;
  return `${value.substring(0, maxLength)}...`;
}
