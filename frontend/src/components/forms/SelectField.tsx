"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "./FormField";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  dataTestId?: string;
}

export function SelectField({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  error,
  hint,
  required = false,
  fullWidth = false,
  className,
  disabled = false,
  dataTestId,
}: SelectFieldProps) {
  const triggerId = `select-field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      fullWidth={fullWidth}
    >
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          id={triggerId}
          aria-label={label}
          className={cn("w-full", error && "border-red-300", className)}
          aria-invalid={!!error}
          data-testid={dataTestId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
