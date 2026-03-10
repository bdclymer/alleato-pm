import { Control, FieldPath, FieldValues } from "react-hook-form"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

interface Props<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  currencySymbol?: string
}

export function RHFMoneyField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder = "0.00",
  description,
  disabled,
  min,
  max,
  step = 0.01,
  currencySymbol = "$",
}: Props<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>

          <FormControl>
            <InputGroup>
              <InputGroupAddon>{currencySymbol}</InputGroupAddon>
              <InputGroupInput
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
            </InputGroup>
          </FormControl>

          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}