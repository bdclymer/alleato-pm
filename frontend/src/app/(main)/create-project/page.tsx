"use client";

import { useState, type HTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type ControllerRenderProps,
  type DefaultValues,
} from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Info } from "lucide-react";
import { AppShell } from "@/components/layout";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const CLEAR_SELECT_VALUE = "__CLEAR_OPTION__";
const ACCEPTED_IMAGE_TYPES = ".jpg,.jpeg,.png,.tif,.tiff,.bmp";

const PROJECT_TEMPLATE_OPTIONS = [
  { value: "standard", label: "Standard Project Template" },
  { value: "shell", label: "Shell Template" },
  { value: "interiors", label: "Interiors Template" },
];

const STAGE_OPTIONS = [
  "Planning",
  "Pre-Construction",
  "Course of Construction",
  "Closeout",
  "Warranty",
  "Archived",
];

const WORK_SCOPE_OPTIONS = [
  "Ground-Up Construction",
  "Renovation",
  "Tenant Improvement",
  "Interior Build-Out",
  "Maintenance",
];

const PROJECT_SECTOR_OPTIONS = [
  "Commercial",
  "Industrial",
  "Infrastructure",
  "Healthcare",
  "Institutional",
  "Residential",
];

const DELIVERY_METHOD_OPTIONS = [
  "Design-Bid-Build",
  "Design-Build",
  "Construction Management at Risk",
  "Integrated Project Delivery",
];

const PROJECT_TYPE_OPTIONS = [
  "New Build",
  "Addition",
  "Fit-Out",
  "Maintenance",
  "Restoration",
];

const TIMEZONE_OPTIONS = [
  { label: "Eastern Time (ET)", value: "America/New_York" },
  { label: "Central Time (CT)", value: "America/Chicago" },
  { label: "Mountain Time (MT)", value: "America/Denver" },
  { label: "Pacific Time (PT)", value: "America/Los_Angeles" },
  { label: "Alaska Time (AKT)", value: "America/Anchorage" },
  { label: "Hawaii Time (HST)", value: "Pacific/Honolulu" },
];

const COUNTRY_OPTIONS = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "Mexico", label: "Mexico" },
];

const REGION_OPTIONS = [
  { value: "Northeast", label: "Northeast" },
  { value: "Southeast", label: "Southeast" },
  { value: "Midwest", label: "Midwest" },
  { value: "Southwest", label: "Southwest" },
  { value: "West Coast", label: "West Coast" },
  { value: "Mountain States", label: "Mountain States" },
];

const OFFICE_OPTIONS = [
  { value: "Alleato Group Indianapolis", label: "Alleato Group Indianapolis" },
  { value: "Alleato Group Tampa", label: "Alleato Group Tampa" },
];

const US_STATE_OPTIONS = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const numberFromInput = (value: unknown) => {
  if (value === "" || value === null || typeof value === "undefined")
    return undefined;
  if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(parsed) ? undefined : parsed;
};

const optionalNumeric = z.preprocess(
  numberFromInput,
  z.number().nonnegative().optional(),
);
const requiredCurrency = z.preprocess(
  numberFromInput,
  z
    .number({ message: "Enter a valid number" })
    .nonnegative({ message: "Must be a positive value" }),
);

const createProjectSchema = z.object({
  project_template: z.string().optional(),
  stage: z.string().optional(),
  name: z.string().min(1, { message: "Project name is required" }),
  project_number: z.string().optional(),
  description: z.string().optional(),
  work_scope: z.string().optional(),
  project_sector: z.string().optional(),
  delivery_method: z.string().optional(),
  project_logo: z.any().optional(),
  project_photo: z.any().optional(),
  square_footage: optionalNumeric,
  total_value: requiredCurrency,
  project_code: z.string().optional(),
  project_type: z.string().optional(),
  active: z.boolean().optional().default(true),
  country: z.string().min(1, { message: "Country is required" }),
  street_address: z.string().min(1, { message: "Street address is required" }),
  city: z.string().min(1, { message: "City is required" }),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  timezone: z.string().min(1, { message: "Timezone is required" }),
  phone: z.string().optional(),
  region: z.string().optional(),
  office: z.string().optional(),
  start_date: z.string().min(1, { message: "Start date is required" }),
  completion_date: z
    .string()
    .min(1, { message: "Completion date is required" }),
  erp_sync: z.boolean().optional().default(true),
  test_project: z.boolean().optional().default(false),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;
type FieldName = keyof CreateProjectFormValues;

type FieldControl =
  | "text"
  | "textarea"
  | "select"
  | "number"
  | "date"
  | "checkbox"
  | "file";

interface FieldDefinition {
  name: FieldName;
  label: string;
  control: FieldControl;
  placeholder?: string;
  description?: string;
  options?: { label: string; value: string }[];
  colSpan?: "full";
  allowEmptyOption?: boolean;
  required?: boolean;
  step?: string;
  accept?: string;
  inputType?: "text" | "email" | "tel";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  statusHint?: string;
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldDefinition[];
}

const formSections: FormSection[] = [
  {
    id: "general-information",
    title: "General Information",
    fields: [
      {
        name: "project_template",
        label: "Project Template",
        control: "select",
        options: PROJECT_TEMPLATE_OPTIONS,
        statusHint: "Not live",
      },
      {
        name: "stage",
        label: "Stage",
        control: "select",
        options: STAGE_OPTIONS.map((value) => ({ value, label: value })),
        allowEmptyOption: true,
        placeholder: "Select stage",
      },
      {
        name: "name",
        label: "Project Name",
        control: "text",
        placeholder: "Goodwill Bart Distribution Center",
        required: true,
      },
      {
        name: "project_number",
        label: "Project Number",
        control: "text",
        placeholder: "24-104",
      },
      {
        name: "description",
        label: "Description",
        control: "textarea",
        placeholder: "Provide a brief overview of the project scope.",
        colSpan: "full",
      },
      {
        name: "work_scope",
        label: "Work Scope",
        control: "select",
        options: WORK_SCOPE_OPTIONS.map((value) => ({ value, label: value })),
        allowEmptyOption: true,
      },
      {
        name: "project_sector",
        label: "Project Sector",
        control: "select",
        options: PROJECT_SECTOR_OPTIONS.map((value) => ({
          value,
          label: value,
        })),
        allowEmptyOption: true,
      },
      {
        name: "delivery_method",
        label: "Delivery Method",
        control: "select",
        options: DELIVERY_METHOD_OPTIONS.map((value) => ({
          value,
          label: value,
        })),
        allowEmptyOption: true,
      },
    ],
  },
  {
    id: "logo",
    title: "Logo",
    description: "Optional media shown on the project home page.",
    fields: [
      {
        name: "project_logo",
        label: "Project Logo",
        control: "file",
        accept: ACCEPTED_IMAGE_TYPES,
        description: "Supported: JPG, PNG, JPEG, TIF/TIFF, BMP.",
        colSpan: "full",
      },
      {
        name: "project_photo",
        label: "Project Photo",
        control: "file",
        accept: ACCEPTED_IMAGE_TYPES,
        description: "Supported: JPG, PNG, JPEG, TIF/TIFF, BMP.",
        colSpan: "full",
      },
    ],
  },
  {
    id: "project-metrics",
    title: "Project Metrics",
    description: "Financial and classification details for reporting.",
    fields: [
      {
        name: "square_footage",
        label: "Square Footage",
        control: "number",
        placeholder: "250000",
        step: "1000",
      },
      {
        name: "total_value",
        label: "Total Value",
        control: "number",
        placeholder: "2500000",
        step: "1000",
        required: true,
      },
      {
        name: "project_code",
        label: "Code",
        control: "text",
        placeholder: "GW-BART",
      },
      {
        name: "project_type",
        label: "Type",
        control: "select",
        options: PROJECT_TYPE_OPTIONS.map((value) => ({ value, label: value })),
        allowEmptyOption: true,
      },
    ],
  },
  {
    id: "project-status",
    title: "Project Status",
    fields: [
      {
        name: "active",
        label: "Active",
        control: "checkbox",
        description:
          "Default checked — active projects appear across the company.",
        colSpan: "full",
      },
    ],
  },
  {
    id: "project-location",
    title: "Project Location",
    description: "Used for maps, reporting, and directory syncing.",
    fields: [
      {
        name: "country",
        label: "Country",
        control: "select",
        options: COUNTRY_OPTIONS,
        required: true,
      },
      {
        name: "street_address",
        label: "Street Address",
        control: "text",
        placeholder: "940 N Marr Road",
        required: true,
        colSpan: "full",
      },
      {
        name: "city",
        label: "City",
        control: "text",
        placeholder: "Columbus",
        required: true,
      },
      {
        name: "state",
        label: "State",
        control: "select",
        options: US_STATE_OPTIONS,
        allowEmptyOption: true,
      },
      {
        name: "postal_code",
        label: "Zip Code",
        control: "text",
        placeholder: "47201",
        inputMode: "numeric",
      },
      {
        name: "timezone",
        label: "Timezone",
        control: "select",
        options: TIMEZONE_OPTIONS,
        required: true,
      },
      {
        name: "phone",
        label: "Phone",
        control: "text",
        inputType: "tel",
        placeholder: "(555) 123-4567",
      },
      {
        name: "region",
        label: "Region",
        control: "select",
        options: REGION_OPTIONS,
        allowEmptyOption: true,
      },
      {
        name: "office",
        label: "Office",
        control: "select",
        options: OFFICE_OPTIONS,
        allowEmptyOption: true,
        description: "Default: Alleato Group.",
      },
    ],
  },
  {
    id: "dates",
    title: "Dates",
    description: "Required milestone dates (mm/dd/yyyy).",
    fields: [
      {
        name: "start_date",
        label: "Start Date",
        control: "date",
        required: true,
        placeholder: "mm/dd/yyyy",
      },
      {
        name: "completion_date",
        label: "Completion Date",
        control: "date",
        required: true,
        placeholder: "mm/dd/yyyy",
      },
    ],
  },
  {
    id: "erp",
    title: "ERP Integration",
    description:
      "Flag projects that will sync once ERP automation ships (not yet live).",
    fields: [
      {
        name: "erp_sync",
        label: "ERP-sync this project",
        control: "checkbox",
        description:
          "Indicator only for now — ERP sync services are still in development.",
        statusHint: "Not live",
        colSpan: "full",
      },
    ],
  },
  {
    id: "advanced",
    title: "Advanced",
    description:
      "Use for sandbox tagging — feature is informational only until automation is wired.",
    fields: [
      {
        name: "test_project",
        label: "Test Project",
        control: "checkbox",
        description:
          "Marks the record as sandbox/test (reports do not yet auto-filter on this flag).",
        statusHint: "Not live",
        colSpan: "full",
      },
    ],
  },
];

const defaultValues: DefaultValues<CreateProjectFormValues> = {
  project_template: "standard",
  stage: undefined,
  name: "",
  project_number: "",
  description: "",
  work_scope: undefined,
  project_sector: undefined,
  delivery_method: undefined,
  project_logo: undefined,
  project_photo: undefined,
  square_footage: undefined,
  total_value: undefined,
  project_code: "",
  project_type: undefined,
  active: true,
  country: "United States",
  street_address: "",
  city: "Test",
  state: undefined,
  postal_code: "",
  timezone: "America/New_York",
  phone: "",
  region: undefined,
  office: "Alleato Group",
  start_date: "",
  completion_date: "",
  erp_sync: true,
  test_project: false,
};

const getFileName = (value: unknown) =>
  typeof File !== "undefined" && value instanceof File ? value.name : null;

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
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
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
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues,
  });

  const { DevAutoFillButton } = useDevAutoFill("project", form.setValue as any);

  const handleSubmit = async (values: CreateProjectFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        name: values.name,
        "job number": values.project_number || null,
        phase: values.stage || "Current", // Default to "Current" if no stage selected
        current_phase: values.stage || "Current", // Default to "Current" if no stage selected
        category: values.project_type || null,
        type: values.project_type || null, // Also set 'type' column
        summary: values.description || null,
        address: values.street_address,
        state: values.state || null,
        archived: !values.active,
        "start date": values.start_date,
        "est completion": values.completion_date,
        "est revenue": values.total_value,
        // Add new columns directly to payload
        work_scope: values.work_scope || null,
        project_sector: values.project_sector || null,
        delivery_method: values.delivery_method || null,
        // Keep other metadata in summary_metadata
        summary_metadata: {
          project_template: values.project_template || null,
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
      toast.success("Project created", {
        description: `${values.name} has been created. Redirecting to project home...`,
      });
      form.reset(defaultValues);
      setFileResetKey((key) => key + 1);
      if (project?.id) {
        // Redirect to the project homepage
        router.push(`/${project.id}/home`);
      } else {
        router.push("/");
      }
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
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      return (
        <Input
          {...ariaProps}
          key={`${String(field.name)}-${fileResetKey}`}
          type="file"
          accept={field.accept}
          onChange={(event) => {
            const file = event.target.files?.[0];
            formField.onChange(file ?? undefined);
          }}
        />
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
              <div className="flex items-start space-x-3 rounded-md border border-input bg-background px-4 py-3">
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {formSections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {section.fields.map(renderField)}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-muted bg-background p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Need to start over?
            </p>
            <p className="text-sm text-muted-foreground">
              Reset clears unsaved values but keeps Procore defaults.
            </p>
          </div>
          <div className="flex justify-between items-center flex-wrap gap-3">
            <DevAutoFillButton />
            <div className="flex flex-wrap gap-3">
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
  );
}
