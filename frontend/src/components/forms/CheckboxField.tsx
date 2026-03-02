"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CheckboxFieldProps {
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function CheckboxField({
  label,
  checked = false,
  onCheckedChange,
  error,
  hint,
  disabled = false,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={cn("flex items-start", className)}>
      <div className="flex h-5 items-center">
        <Checkbox
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className={cn(error && "border-destructive/50")}
          aria-invalid={!!error}
        />
      </div>
      <div className="ml-4">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
