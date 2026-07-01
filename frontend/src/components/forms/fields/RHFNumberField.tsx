import { Control, FieldPath, FieldValues } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { NumberInput } from "@/components/ui/number-input"

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
  const parseNumberValue = (raw: string): number => {
    if (raw.trim() === "") return Number.NaN
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? Number.NaN : parsed
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          {description && <FormDescription>{description}</FormDescription>}

          <FormControl>
            <NumberInput
              name={field.name}
              ref={field.ref}
              value={field.value ?? ""}
              onChange={e => field.onChange(parseNumberValue(e.target.value))}
              onBlur={field.onBlur}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              clearZeroOnFocus
            />
          </FormControl>

          <FormMessage />
        </FormItem>
      )}
    />
  )
}
