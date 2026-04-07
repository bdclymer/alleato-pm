"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: React.ReactNode;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const FormFieldContext = React.createContext<string | undefined>(undefined);

/** Returns the auto-generated input id from the nearest FormField. */
export function useFormFieldId(): string | undefined {
  return React.useContext(FormFieldContext);
}

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

  return (
    <FormFieldContext.Provider value={inputId}>
      <div className={cn(fullWidth ? "sm:col-span-2" : "", className)}>
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        <div className="mt-1">
          {children}
          {hint && !error && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </FormFieldContext.Provider>
  );
}
