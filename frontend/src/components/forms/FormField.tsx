"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared base props for all form field components.
 * Import this and extend it to avoid repeating error/hint/required/fullWidth/disabled.
 */
export interface FormFieldBaseProps {
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

interface FormFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  fullWidth?: boolean;
}

// ── Layout context ─────────────────────────────────────────────────────────

export type FormFieldLayout = "stacked" | "horizontal";
const FormLayoutContext = React.createContext<FormFieldLayout>("stacked");

export function useFormLayout(): FormFieldLayout {
  return React.useContext(FormLayoutContext);
}

export function FormLayoutProvider({
  layout,
  children,
}: {
  layout: FormFieldLayout;
  children: React.ReactNode;
}) {
  return (
    <FormLayoutContext.Provider value={layout}>
      {children}
    </FormLayoutContext.Provider>
  );
}

// ── Field id context ───────────────────────────────────────────────────────

const FormFieldContext = React.createContext<string | undefined>(undefined);

/** Returns the auto-generated input id from the nearest FormField. */
export function useFormFieldId(): string | undefined {
  return React.useContext(FormFieldContext);
}

// ── FormField ──────────────────────────────────────────────────────────────

export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  className,
  fullWidth = false,
}: FormFieldProps) {
  const inputId = React.useId();
  const layout = useFormLayout();

  if (layout === "horizontal") {
    return (
      <FormFieldContext.Provider value={inputId}>
        <div className={cn("flex items-start gap-x-3", className)}>
          <label
            htmlFor={inputId}
            className="w-36 shrink-0 pt-2 text-sm font-medium text-foreground"
          >
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </label>
          <div className="flex-1 min-w-0">
            {hint && !error && (
              <p className="mb-1.5 text-sm text-muted-foreground">{hint}</p>
            )}
            {children}
            {error && (
              <p className="mt-1.5 text-sm text-destructive" data-field-error="">
                {error}
              </p>
            )}
          </div>
        </div>
      </FormFieldContext.Provider>
    );
  }

  return (
    <FormFieldContext.Provider value={inputId}>
      <div className={cn(fullWidth ? "sm:col-span-2" : "", className)}>
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {hint && !error && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        <div className="mt-1">
          {children}
          {error && <p className="mt-2 text-sm text-destructive" data-field-error="">{error}</p>}
        </div>
      </div>
    </FormFieldContext.Provider>
  );
}
