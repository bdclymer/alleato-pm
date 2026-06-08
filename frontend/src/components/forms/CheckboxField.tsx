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
  const hasDetail = Boolean(hint || error);

  return (
    <div className={cn("flex gap-3", hasDetail ? "items-start" : "items-center", className)}>
      <div className={cn("flex h-5 items-center", hasDetail && "pt-0.5")}>
        <Checkbox
          checked={checked}
          onCheckedChange={(nextChecked) => onCheckedChange?.(nextChecked === true)}
          disabled={disabled}
          className={cn(error && "border-destructive/50")}
          aria-invalid={!!error}
        />
      </div>
      <div className={cn("min-w-0", hasDetail && "space-y-1")}>
        <label className="text-sm font-medium leading-5 text-foreground">{label}</label>
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
