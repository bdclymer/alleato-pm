"use client";

import type { ReactElement } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type InlineSelectOption = {
  value: string;
  label: string;
};

export function InlineSelectEditor({
  value,
  options,
  placeholder = "Select value",
  onChange,
  onCommit,
}: {
  value: string;
  options: InlineSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  onCommit: (value?: string) => void;
}): ReactElement {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        onChange(nextValue);
        window.requestAnimationFrame(() => onCommit(nextValue));
      }}
    >
      <SelectTrigger
        size="sm"
        variant="inline"
        className="h-8 px-0"
        data-row-interactive="true"
        aria-label={placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
