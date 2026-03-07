"use client";

import { useState, useRef, useEffect, useMemo, type HTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type ControllerRenderProps,
  type DefaultValues,
} from "react-hook-form";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Info,
  Upload,
  ImageIcon,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { useDevAutoFill } from "@/hooks/use-dev-autofill";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectCreatedModal } from "@/components/project/ProjectCreatedModal";
import { useCreateProjectDevConfig } from "@/components/project/create-project-dev-config";
import {
  createProjectSchema,
  defaultValues,
  formSections,
  formatCurrency,
  formatNumberWithCommas,
  FormLayoutMode,
  getFieldControlOptions,
  isControlAllowedForField,
  parseFormattedNumber,
  type CreateProjectFormValues,
  type FieldDefinition,
  type FieldName,
  type FormSection,
} from "@/lib/create-project/form";

const CLEAR_SELECT_VALUE = "__CLEAR_OPTION__";
const getFileName = (value: unknown) =>
  typeof File !== "undefined" && value instanceof File ? value.name : null;

/**
 * Input that formats numbers with commas as you type while preserving cursor position.
 * On blur, applies the full format (e.g. currency prefix).
 */
function FormattedNumberInput({
  ariaProps,
  placeholder,
  value,
  onChange,
  format,
  inputMode = "numeric",
}: {
  ariaProps: Record<string, string>;
  placeholder?: string;
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  format: (v: number | string | undefined | null) => string;
  inputMode?: "numeric" | "decimal";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => format(value));
  const [isFocused, setIsFocused] = useState(false);
  const cursorRef = useRef<number | null>(null);

  // Sync from form state when not focused (auto-fill, reset, initial load)
  const formattedFromForm = format(value);
  if (!isFocused && displayValue !== formattedFromForm) {
    setDisplayValue(formattedFromForm);
  }

  // Restore cursor position after formatting changes the display value
  useEffect(() => {
    if (cursorRef.current != null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorRef.current, cursorRef.current);
      cursorRef.current = null;
    }
  });

  // Format with commas only (no $ prefix) for while-typing display
  const formatWhileTyping = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    if (cleaned === "") return "";
    // Split on decimal point to only format the integer part
    const parts = cleaned.split(".");
    const intPart = parts[0];
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (parts.length > 1) {
      return `${formatted}.${parts[1]}`;
    }
    return formatted;
  };

  return (
    <Input
      {...ariaProps}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={displayValue}
      onFocus={() => {
        setIsFocused(true);
        // Show comma-formatted number on focus (strip $ but keep commas)
        if (value != null) {
          setDisplayValue(formatWhileTyping(String(value)));
        }
      }}
      onChange={(event) => {
        const raw = event.target.value;
        const cursorPos = event.target.selectionStart ?? 0;

        // Count commas before cursor in old value
        const oldCommasBefore = (displayValue.slice(0, cursorPos).match(/,/g) || []).length;

        const formatted = formatWhileTyping(raw);

        // Count commas before equivalent cursor position in new value
        // The cursor position in the raw string (minus old commas) tells us where the digit cursor is
        const digitPos = cursorPos - oldCommasBefore;
        let newCursor = 0;
        let digits = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (digits === digitPos) break;
          if (formatted[i] !== ",") digits++;
          newCursor = i + 1;
        }
        cursorRef.current = newCursor;

        setDisplayValue(formatted);
        const parsed = parseFormattedNumber(formatted);
        onChange(parsed);
      }}
      onBlur={() => {
        const parsed = parseFormattedNumber(displayValue);
        onChange(parsed);
        setDisplayValue(format(parsed));
        setIsFocused(false);
      }}
    />
  );
}

export default function CreateProjectPage() {
  return (
    <AppShell
      companyName="Alleato Group"
      currentTool="Portfolio"
      userInitials="BC"
    >
      <div className="flex min-h-[calc(100vh-48px)] flex-col bg-muted">
        <header className="border-b bg-background">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Portfolio
              </Link>
              <span>/</span>
              <span>Projects</span>
              <span>/</span>
              <span className="text-foreground">Create Project</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Create Project
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="rounded-full border border-dashed border-orange-200 px-4 py-1">
                  Draft status · Not synced
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-8">
            <CreateProjectForm />
          </div>
        </main>
      </div>
    </AppShell>
  );
}

function CreateProjectForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileResetKey, setFileResetKey] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues,
  });

  const { DevAutoFillButton } = useDevAutoFill("project", form.setValue as any);
  const { isDevAdmin, activeTemplateConfig } = useCreateProjectDevConfig();

  const effectiveFormSections = useMemo(() => {
    if (!isDevAdmin) return formSections;

    return formSections
      .map((section) => {
        const sectionOverride = activeTemplateConfig.sections[section.id];
        if (sectionOverride?.hidden) return null;

        const fields = section.fields
          .filter((field) => !activeTemplateConfig.fields[field.name]?.hidden)
          .map((field) => {
            const fieldOverride = activeTemplateConfig.fields[field.name];
            if (!fieldOverride) return field;

            const control =
              fieldOverride.control &&
              isControlAllowedForField(field, fieldOverride.control)
                ? fieldOverride.control
                : field.control;

            return {
              ...field,
              control,
              colSpan: fieldOverride.colSpan ?? field.colSpan,
            };
          });

        if (fields.length === 0) return null;

        return {
          ...section,
          fields,
        };
      })
      .filter((section): section is FormSection => section !== null);
  }, [activeTemplateConfig, isDevAdmin]);

  const handleSubmit = async (values: CreateProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        "job number": values.project_number || null,
        current_phase: values.stage || null,
        phase: values.phase || null,
        type: values.project_type || null,
        summary: values.description || null,
        address: values.street_address,
        state: values.state || null,
        archived: !values.active,
        "start date": values.start_date?.trim() ? values.start_date : null,
        "est completion": values.completion_date?.trim()
          ? values.completion_date
          : null,
        "est revenue": values.total_value ?? null,
        // Add new columns directly to payload
        work_scope: values.work_scope || null,
        project_sector: values.project_sector || null,
        delivery_method: values.delivery_method || null,
        // Keep other metadata in summary_metadata
        summary_metadata: {
          square_footage: values.square_footage ?? null,
          project_code: values.project_code || null,
          city: values.city,
          postal_code: values.postal_code || null,
          country: values.country,
          timezone: values.timezone,
          phone: values.phone || null,
          region: values.region || null,
          office: values.office || null,
          erp_sync: values.erp_sync,
          test_project: values.test_project,
          project_logo: getFileName(values.project_logo),
          project_photo: getFileName(values.project_photo),
        },
      };

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Unable to create project" }));
        throw new Error(error.error || "Unable to create project");
      }

      const project = await response.json();

      // Store project info and show success modal
      setCreatedProject({
        id: String(project.id),
        name: values.name,
      });
      setShowSuccessModal(true);

      form.reset(defaultValues);
      setFileResetKey((key) => key + 1);
    } catch (error) {
      toast.error("Failed to create project", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldControl = (
    field: FieldDefinition,
    formField: ControllerRenderProps<CreateProjectFormValues, FieldName>,
    fieldId: string,
    labelId: string,
  ) => {
    const ariaProps = {
      id: fieldId,
      "aria-label": field.label,
      "aria-labelledby": labelId,
    };

    if (field.control === "textarea") {
      return (
        <Textarea
          {...ariaProps}
          placeholder={field.placeholder}
          className="min-h-[120px]"
          value={formField.value ?? ""}
          onChange={(event) => formField.onChange(event.target.value)}
        />
      );
    }

    if (field.control === "select") {
      return (
        <Select
          value={formField.value ?? undefined}
          onValueChange={(value) => {
            if (field.allowEmptyOption && value === CLEAR_SELECT_VALUE) {
              formField.onChange(undefined);
              return;
            }
            formField.onChange(value);
          }}
        >
          <SelectTrigger
            id={fieldId}
            aria-label={field.label}
            aria-labelledby={labelId}
          >
            <SelectValue
              placeholder={
                field.placeholder ?? `Select ${field.label.toLowerCase()}`
              }
            />
          </SelectTrigger>
          <SelectContent>
            {field.allowEmptyOption && (
              <SelectItem
                value={CLEAR_SELECT_VALUE}
                className="text-muted-foreground"
              >
                Clear selection
              </SelectItem>
            )}
            {field.options?.map((option: { label: string; value: string }) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.control === "formatted-number") {
      return (
        <FormattedNumberInput
          ariaProps={ariaProps}
          placeholder={field.placeholder}
          value={formField.value}
          onChange={formField.onChange}
          format={formatNumberWithCommas}
        />
      );
    }

    if (field.control === "currency") {
      return (
        <FormattedNumberInput
          ariaProps={ariaProps}
          placeholder={field.placeholder}
          value={formField.value}
          onChange={formField.onChange}
          format={formatCurrency}
          inputMode="decimal"
        />
      );
    }

    if (field.control === "number") {
      return (
        <Input
          {...ariaProps}
          type="number"
          step={field.step ?? "1"}
          placeholder={field.placeholder}
          value={formField.value ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            formField.onChange(value === "" ? undefined : Number(value));
          }}
        />
      );
    }

    if (field.control === "date") {
      return (
        <Input
          {...ariaProps}
          type="date"
          placeholder={field.placeholder}
          value={formField.value ?? ""}
          onChange={(event) => formField.onChange(event.target.value)}
        />
      );
    }

    if (field.control === "file") {
      const file =
        typeof File !== "undefined" && formField.value instanceof File
          ? formField.value
          : null;
      const inputId = `${fieldId}-file-input`;

      return (
        <div key={`${String(field.name)}-${fileResetKey}`}>
          <input
            id={inputId}
            type="file"
            accept={field.accept}
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              formField.onChange(selected ?? undefined);
            }}
          />
          {file ? (
            <div className="flex items-center gap-4 rounded-lg border border-input bg-background px-4 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  formField.onChange(undefined);
                  setFileResetKey((k) => k + 1);
                }}
                className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor={inputId}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-8 cursor-pointer hover:border-muted-foreground/40 hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Click to upload
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  JPG, PNG, TIFF, or BMP
                </p>
              </div>
            </label>
          )}
        </div>
      );
    }

    // Default text input
    return (
      <Input
        {...ariaProps}
        type={field.inputType ?? "text"}
        placeholder={field.placeholder}
        inputMode={field.inputMode}
        value={formField.value ?? ""}
        onChange={(event) => formField.onChange(event.target.value)}
      />
    );
  };

  const renderField = (field: FieldDefinition) => (
    <FormField
      key={field.name}
      control={form.control}
      name={field.name}
      render={({ field: formField }) => {
        const fieldId = String(field.name);
        const labelId = `${fieldId}-label`;
        const baseClasses = field.colSpan === "full" ? "md:col-span-2" : "";
        if (field.control === "checkbox") {
          return (
            <FormItem className={baseClasses}>
              <div className="flex items-start space-x-4 rounded-md border border-input bg-background px-4 py-4">
                <FormControl>
                  <Checkbox
                    id={fieldId}
                    checked={!!formField.value}
                    onCheckedChange={(checked) =>
                      formField.onChange(Boolean(checked))
                    }
                  />
                </FormControl>
                <div className="space-y-1">
                  <FormLabel
                    id={labelId}
                    htmlFor={fieldId}
                    className="font-medium leading-none"
                  >
                    <span className="flex items-center gap-2">
                      <span>
                        {field.label}
                        {field.required && (
                          <span className="text-destructive">*</span>
                        )}
                      </span>
                      {field.statusHint && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-900">
                          <Info className="h-3 w-3" />
                          {field.statusHint}
                        </span>
                      )}
                    </span>
                  </FormLabel>
                  {field.description && (
                    <FormDescription>{field.description}</FormDescription>
                  )}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          );
        }

        return (
          <FormItem className={baseClasses}>
            <FormLabel id={labelId} htmlFor={fieldId}>
              <span className="flex items-center gap-2">
                <span>
                  {field.label}
                  {field.required && (
                    <span className="text-destructive">*</span>
                  )}
                </span>
                {field.statusHint && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-xs font-medium text-amber-900">
                    <Info className="h-3 w-3" />
                    {field.statusHint}
                  </span>
                )}
              </span>
            </FormLabel>
            <FormControl>
              {renderFieldControl(field, formField, fieldId, labelId)}
            </FormControl>
            {field.description && (
              <FormDescription>{field.description}</FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  const activeLayout: FormLayoutMode = isDevAdmin
    ? activeTemplateConfig.layout
    : "cards";

  const renderSection = (section: FormSection) => {
    if (activeLayout === "sections") {
      return (
        <section key={section.id} className="space-y-4 border-b border-border pb-8">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.fields.map(renderField)}
          </div>
        </section>
      );
    }

    return (
      <Card key={section.id}>
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.description && (
            <CardDescription>{section.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div
            className={
              activeLayout === "single-column"
                ? "grid grid-cols-1 gap-4"
                : "grid grid-cols-1 gap-4 md:grid-cols-2"
            }
          >
            {section.fields.map(renderField)}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <ProjectCreatedModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          if (createdProject?.id) {
            router.push(`/${createdProject.id}/home`);
          }
        }}
        projectId={createdProject?.id ?? ""}
        projectName={createdProject?.name ?? ""}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {effectiveFormSections.length > 0 ? (
            effectiveFormSections.map(renderSection)
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No fields are currently visible for the selected template.
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-4 rounded-lg border border-dashed border-muted bg-background p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Need to start over?
              </p>
              <p className="text-sm text-muted-foreground">
                Reset clears unsaved values but keeps Procore defaults.
              </p>
            </div>
            <div className="flex justify-between items-center flex-wrap gap-4">
              <DevAutoFillButton />
              <div className="flex flex-wrap gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.reset(defaultValues);
                    setFileResetKey((key) => key + 1);
                  }}
                >
                  Reset Form
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? "Creating Project…" : "Create Project"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}
