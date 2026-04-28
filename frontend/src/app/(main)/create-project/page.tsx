"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageShell } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useDevAutoFill } from "@/hooks/use-dev-autofill";
import {
  Form,
  FormGrid,
  FormLayoutProvider,
  TextField,
  TextareaField,
  SelectField,
  NumberField,
  MoneyField,
  DateField,
  CheckboxField,
  FileUploadField,
} from "@/components/forms";
import { ProjectCreatedModal } from "@/components/project/ProjectCreatedModal";
import { useCreateProjectDevConfig } from "@/components/project/create-project-dev-config";
import { apiFetch } from "@/lib/api-client";
import {
  createProjectSchema,
  defaultValues,
  formSections,
  FormLayoutMode,
  isControlAllowedForField,
  type CreateProjectFormValues,
  type FieldDefinition,
  type FormSection,
} from "@/lib/create-project/form";
import { FormSection as StandardFormSection } from "@/components/forms/FormSection";
import { FormActions } from "@/components/forms/FormActions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CLEAR_SELECT_VALUE = "__CLEAR_OPTION__";
const PROJECT_MEDIA_TOOLTIP: Record<string, string> = {
  project_logo:
    "Accepted formats: .jpg, .jpeg, .png, .tif, .tiff, .bmp. Square image recommended.",
  project_photo:
    "Accepted formats: .jpg, .jpeg, .png, .tif, .tiff, .bmp. Landscape image recommended.",
};

const getFileName = (value: unknown) =>
  typeof File !== "undefined" && value instanceof File ? value.name : null;

export default function CreateProjectPage() {
  return (
    <PageShell
      variant="form"
      title="Create Project"
      description="Set up core project details, location, and delivery defaults."
    >
      <CreateProjectForm />
    </PageShell>
  );
}

function CreateProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboardingTestProject = searchParams.get("testProject") === "1";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileResetKey, setFileResetKey] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdProject, setCreatedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema) as any,
    defaultValues: {
      ...defaultValues,
      test_project: isOnboardingTestProject || defaultValues.test_project,
    },
  });

  const { DevAutoFillButton } = useDevAutoFill("project", form.setValue as any);
  const { isDevAdmin, activeTemplateConfig } = useCreateProjectDevConfig();
  const values = form.watch();
  const errors = form.formState.errors;

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
        onedrive: values.onedrive || null,
        // Keep other metadata in summary_metadata
        summary_metadata: {
          square_footage: values.square_footage ?? null,
          project_code: values.project_code || null,
          city: values.city,
          postal_code: values.postal_code || null,
          country: values.country,
          office: values.office || null,
          erp_sync: values.erp_sync,
          test_project: values.test_project,
          project_logo: getFileName(values.project_logo),
          project_photo: getFileName(values.project_photo),
        },
      };

      const project = await apiFetch<{ id: string | number }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });

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

  const renderField = (field: FieldDefinition) => {
    const currentValue = values[field.name];
    const error = errors[field.name]?.message as string | undefined;
    const fullWidth = field.colSpan === "full";

    if (field.control === "textarea") {
      return (
        <TextareaField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          placeholder={field.placeholder}
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(event) =>
            form.setValue(field.name, event.target.value as never, {
              shouldValidate: true,
            })
          }
          rows={5}
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "select") {
      const options = field.allowEmptyOption
        ? [{ value: CLEAR_SELECT_VALUE, label: "Clear selection" }, ...(field.options ?? [])]
        : (field.options ?? []);

      return (
        <SelectField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
          options={options}
          value={typeof currentValue === "string" ? currentValue : undefined}
          onValueChange={(value) =>
            form.setValue(
              field.name,
              (field.allowEmptyOption && value === CLEAR_SELECT_VALUE
                ? undefined
                : value) as never,
              { shouldValidate: true },
            )
          }
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "formatted-number") {
      return (
        <NumberField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          placeholder={field.placeholder}
          value={typeof currentValue === "number" ? currentValue : undefined}
          onChange={(value) =>
            form.setValue(field.name, value as never, { shouldValidate: true })
          }
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "currency") {
      return (
        <MoneyField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          placeholder={field.placeholder}
          value={typeof currentValue === "number" ? currentValue : undefined}
          onChange={(value) =>
            form.setValue(field.name, value as never, { shouldValidate: true })
          }
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "number") {
      return (
        <NumberField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          placeholder={field.placeholder}
          value={typeof currentValue === "number" ? currentValue : undefined}
          onChange={(value) =>
            form.setValue(field.name, value as never, { shouldValidate: true })
          }
          step={field.step ?? "1"}
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "date") {
      return (
        <DateField
          key={field.name}
          label={field.label}
          required={field.required}
          hint={field.description}
          error={error}
          value={
            typeof currentValue === "string" && currentValue
              ? new Date(`${currentValue}T00:00:00`)
              : undefined
          }
          onChange={(value) =>
            form.setValue(
              field.name,
              (value ? value.toISOString().split("T")[0] : "") as never,
              { shouldValidate: true },
            )
          }
          fullWidth={fullWidth}
        />
      );
    }

    if (field.control === "checkbox") {
      return (
        <div key={field.name} className={fullWidth ? "sm:col-span-2" : undefined}>
          <CheckboxField
            label={field.label}
            checked={Boolean(currentValue)}
            onCheckedChange={(checked) =>
              form.setValue(field.name, checked as never, { shouldValidate: true })
            }
            error={error}
          />
        </div>
      );
    }

    if (field.control === "file") {
      const file =
        typeof File !== "undefined" && currentValue instanceof File ? currentValue : null;
      const tooltipContent = PROJECT_MEDIA_TOOLTIP[field.name];
      const fieldLabel = tooltipContent ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{field.label}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm text-left">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        field.label
      );
      const shouldHideMediaHint = field.name === "project_logo" || field.name === "project_photo";

      return (
        <FileUploadField
          key={`${field.name}-${fileResetKey}`}
          label={fieldLabel}
          hint={shouldHideMediaHint ? undefined : field.description}
          error={error}
          accept={field.accept}
          maxFiles={1}
          variant="minimal"
          showMetaText={!shouldHideMediaHint}
          fullWidth={fullWidth}
          value={
            file
              ? [{ name: file.name, size: file.size, type: file.type }]
              : []
          }
          onChange={(files) => {
            if (files.length === 0) {
              form.setValue(field.name, undefined as never, {
                shouldValidate: true,
              });
              setFileResetKey((key) => key + 1);
            }
          }}
          onFilesSelected={(files) =>
            form.setValue(field.name, (files[0] ?? undefined) as never, {
              shouldValidate: true,
            })
          }
        />
      );
    }

    return (
      <TextField
        key={field.name}
        label={field.label}
        required={field.required}
        hint={field.description}
        error={error}
        placeholder={field.placeholder}
        inputMode={field.inputMode}
        value={typeof currentValue === "string" ? currentValue : ""}
        onChange={(event) =>
          form.setValue(field.name, event.target.value as never, {
            shouldValidate: true,
          })
        }
        fullWidth={fullWidth}
      />
    );
  };

  const activeLayout: FormLayoutMode = isDevAdmin
    ? activeTemplateConfig.layout === "cards"
      ? "sections"
      : activeTemplateConfig.layout
    : "sections";

  const renderSection = (section: FormSection) => {
    const sectionColumns =
      section.id === "project-status" ? 1 : activeLayout === "single-column" ? 1 : 2;
    const hideSectionDescription = section.id === "logo";

    const content = (
      <StandardFormSection
        key={section.id}
        title={section.title}
        description={hideSectionDescription ? undefined : section.description}
        showDivider={false}
      >
        <FormGrid columns={sectionColumns} className={section.id === "project-status" ? "gap-y-2" : undefined}>{section.fields.map(renderField)}</FormGrid>
      </StandardFormSection>
    );

    if (section.id === "logo") {
      return (
        <FormLayoutProvider key={section.id} layout="stacked">
          {content}
        </FormLayoutProvider>
      );
    }

    return content;
  };

  return (
    <>
      <ProjectCreatedModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
        }}
        onViewDashboard={() => {
          setShowSuccessModal(false);
          if (createdProject?.id) router.push(`/${createdProject.id}/home`);
        }}
        projectId={createdProject?.id ?? ""}
        projectName={createdProject?.name ?? ""}
      />

      <Form onSubmit={form.handleSubmit(handleSubmit)}>
        <FormLayoutProvider layout="horizontal">
          <div className="flex flex-col gap-16">
            {effectiveFormSections.length > 0 ? (
              effectiveFormSections.map(renderSection)
            ) : (
              <EmptyState
                icon={<Settings />}
                title="No fields visible"
                description="No fields are currently visible for the selected template."
              />
            )}
          </div>
        </FormLayoutProvider>

        <FormActions
          submitLabel={isSubmitting ? "Creating Project..." : "Create Project"}
          onCancel={() => router.push("/")}
          isSubmitting={isSubmitting}
        >
          <div className="flex flex-wrap items-center gap-3">
            <DevAutoFillButton />
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
          </div>
        </FormActions>
      </Form>
    </>
  );
}
