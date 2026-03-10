import { Control, FieldPath, FieldValues } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { Input } from "@/components/ui/input"

interface Props<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

export function RHFNumberField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  min,
  max,
  step = 1,
  disabled,
}: Props<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>

          <FormControl>
            <Input
              type="number"
              inputMode="decimal"
              name={field.name}
              ref={field.ref}
              value={field.value ?? ""}
              onChange={e => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
            />
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}