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

export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  className,
  fullWidth = false,
}: FormFieldProps) {
  return (
    <div className={cn(fullWidth ? "sm:col-span-2" : "", className)}>
      <div className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </div>
      <div className="mt-1">
        {children}
        {hint && !error && <p className="mt-2 text-sm text-muted-foreground">{hint}</p>}
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
