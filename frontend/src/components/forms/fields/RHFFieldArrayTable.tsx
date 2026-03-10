"use client"

import * as React from "react"
import {
  Control,
  FieldArrayPath,
  FieldValues,
  useFieldArray,
} from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Column<TFieldValues extends FieldValues, TName extends FieldArrayPath<TFieldValues>> = {
  key: string
  header: React.ReactNode
  className?: string
  cell: (args: {
    index: number
    rowName: `${TName}.${number}`
  }) => React.ReactNode
}

interface Props<
  TFieldValues extends FieldValues,
  TName extends FieldArrayPath<TFieldValues>
> {
  control: Control<TFieldValues>
  name: TName
  label?: string
  description?: string
  columns: Column<TFieldValues, TName>[]
  createRow: () => Record<string, unknown>
  addLabel?: string
  minRows?: number
}

export function RHFFieldArrayTable<
  TFieldValues extends FieldValues,
  TName extends FieldArrayPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  columns,
  createRow,
  addLabel = "Add Row",
  minRows = 1,
}: Props<TFieldValues, TName>) {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  })

  React.useEffect(() => {
    if (fields.length === 0 && minRows > 0) {
      for (let i = 0; i < minRows; i += 1) {
        append(createRow())
      }
    }
  }, [append, createRow, fields.length, minRows])

  return (
    <div className="space-y-4">
      {(label || description) && (
        <div className="space-y-1">
          {label && <h3 className="text-sm font-medium">{label}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {fields.map((field, index) => {
              const rowName = `${name}.${index}` as `${TName}.${number}`

              return (
                <TableRow key={field.id}>
                  {columns.map(column => (
                    <TableCell key={column.key} className={column.className}>
                      {column.cell({ index, rowName })}
                    </TableCell>
                  ))}

                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length <= minRows}
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => append(createRow())}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  )
}