"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface ToggleFieldProps {
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function ToggleField({
  label,
  checked = false,
  onCheckedChange,
  error,
  hint,
  disabled = false,
  className,
}: ToggleFieldProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex-1">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {hint && !error && <p className="text-sm text-muted-foreground">{hint}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(error && "border-destructive/50")}
        aria-invalid={!!error}
      />
    </div>
  );
}
