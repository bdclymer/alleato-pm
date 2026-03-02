"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, X, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createTableRow,
  updateTableRow,
} from "@/app/(other)/actions/admin-table-actions";
import { type ColumnMetadata } from "@/server/db/introspection";
import { type TableName } from "@/lib/table-registry";
import { toast } from "sonner";

interface AutoFormProps {
  table: TableName;
  columns: ColumnMetadata[];
  initialValues?: Record<string, unknown>;
  mode: "create" | "edit";
  rowId?: string | number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AutoForm({
  table,
  columns,
  initialValues = {},
  mode,
  rowId,
  onSuccess,
  onCancel,
}: AutoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [showHidden, setShowHidden] = useState(false);

  // Separate visible and hidden columns
  const visibleColumns = columns.filter((col) => !col.isHidden);
  const hiddenColumns = columns.filter((col) => col.isHidden);

  const handleChange = (columnName: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [columnName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up values - convert empty strings to null for nullable fields
    const cleanedValues: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      if (value === "" || value === undefined) {
        const col = columns.find((c) => c.column_name === key);
        cleanedValues[key] = col?.is_nullable ? null : value;
      } else {
        cleanedValues[key] = value;
      }
    }

    startTransition(async () => {
      let result;

      if (mode === "create") {
        result = await createTableRow(table, cleanedValues);
      } else if (rowId !== undefined) {
        result = await updateTableRow(table, rowId, cleanedValues);
      } else {
        toast.error("Missing row ID for update");
        return;
      }

      if (result.success) {
        toast.success(
          mode === "create"
            ? "Row created successfully"
            : "Row updated successfully",
        );
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/admin/tables/${table}`);
        }
      } else {
        toast.error(result.error ?? "An error occurred");
      }
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "create" ? "Create New Row" : "Edit Row"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {visibleColumns.map((column) => (
            <FieldRenderer
              key={column.column_name}
              column={column}
              value={values[column.column_name]}
              onChange={(value) => handleChange(column.column_name, value)}
              disabled={isPending || column.isReadOnly}
            />
          ))}

          {hiddenColumns.length > 0 && (
            <div className="pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
                className="gap-2 -ml-2"
              >
                {showHidden ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {showHidden ? "Hide" : "Show"} hidden fields (
                {hiddenColumns.length})
              </Button>

              {showHidden && (
                <div className="mt-4 space-y-6">
                  {hiddenColumns.map((column) => (
                    <FieldRenderer
                      key={column.column_name}
                      column={column}
                      value={values[column.column_name]}
                      onChange={(value) =>
                        handleChange(column.column_name, value)
                      }
                      disabled={isPending || column.isReadOnly}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            <Save className="mr-2 h-4 w-4" />
            {isPending
              ? "Saving..."
              : mode === "create"
                ? "Create"
                : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

interface FieldRendererProps {
  column: ColumnMetadata;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function FieldRenderer({
  column,
  value,
  onChange,
  disabled,
}: FieldRendererProps) {
  const { column_name, label, inputType, is_nullable, isReadOnly } = column;

  const commonProps = {
    id: column_name,
    disabled: disabled || isReadOnly,
    "aria-describedby": `${column_name}-hint`,
  };

  const renderInput = () => {
    switch (inputType) {
      case "boolean":
        return (
          <div className="flex items-center gap-4">
            <Switch
              {...commonProps}
              checked={Boolean(value)}
              onCheckedChange={onChange}
            />
            <Label htmlFor={column_name} className="font-normal">
              {value ? "Yes" : "No"}
            </Label>
          </div>
        );

      case "number":
        return (
          <Input
            {...commonProps}
            type="number"
            value={(value as string) ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val === "" ? null : parseFloat(val));
            }}
            step="any"
          />
        );

      case "datetime":
        return (
          <Input
            {...commonProps}
            type="datetime-local"
            value={formatDateTimeForInput(value as string)}
            onChange={(e) =>
              onChange(
                e.target.value ? new Date(e.target.value).toISOString() : null,
              )
            }
          />
        );

      case "date":
        return (
          <Input
            {...commonProps}
            type="date"
            value={formatDateForInput(value as string)}
            onChange={(e) => onChange(e.target.value || null)}
          />
        );

      case "time":
        return (
          <Input
            {...commonProps}
            type="time"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        );

      case "json":
        return (
          <Textarea
            {...commonProps}
            value={formatJsonForInput(value)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Keep as string if not valid JSON yet
                onChange(e.target.value);
              }
            }}
            className="font-mono text-sm"
            rows={4}
            placeholder="{}"
          />
        );

      case "email":
        return (
          <Input
            {...commonProps}
            type="email"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="email@example.com"
          />
        );

      case "url":
        return (
          <Input
            {...commonProps}
            type="url"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://"
          />
        );

      case "uuid":
        return (
          <Input
            {...commonProps}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            className="font-mono text-sm"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            pattern="[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
          />
        );

      case "text":
      default:
        // Use textarea for potentially long text fields
        if (
          column_name.includes("description") ||
          column_name.includes("notes") ||
          column_name.includes("content") ||
          column_name.includes("body") ||
          column_name.includes("text")
        ) {
          return (
            <Textarea
              {...commonProps}
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value || null)}
              rows={3}
            />
          );
        }

        return (
          <Input
            {...commonProps}
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={column_name} className="flex items-center gap-1">
          {label}
          {!is_nullable && <span className="text-destructive">*</span>}
        </Label>
        {isReadOnly && (
          <span className="text-xs text-muted-foreground">Read-only</span>
        )}
      </div>
      {renderInput()}
      {is_nullable && (
        <p id={`${column_name}-hint`} className="text-xs text-muted-foreground">
          Optional
        </p>
      )}
    </div>
  );
}

function formatDateTimeForInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    return date.toISOString().slice(0, 16);
  } catch {
    return "";
  }
}

function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatJsonForInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}
