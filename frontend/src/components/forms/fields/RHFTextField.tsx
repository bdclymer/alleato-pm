import * as React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RHFTextFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  description?: string;
  type?: React.InputHTMLAttributes<HTMLInputElement>["type"];
  autoComplete?: string;
  disabled?: boolean;
}

export function RHFTextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = "text",
  autoComplete,
  disabled,
}: RHFTextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              type={type}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
