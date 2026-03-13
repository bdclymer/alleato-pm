"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { AppShell } from "@/components/layouts";
import { ProjectFormPageLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useDevAutoFill } from "@/hooks/use-dev-autofill";
import {
  Form,
  FormGrid,
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

const CLEAR_SELECT_VALUE = "__CLEAR_OPTION__";
const getFileName = (value: unknown) =>
  typeof File !== "undefined" && value instanceof File ? value.name : null;

export default function CreateProjectPage() {
  return (
    <AppShell
      companyName="Alleato Group"
      currentTool="Portfolio"
      userInitials="BC"
    >
      <ProjectFormPageLayout
        title="Create Project"
        description="Set up core project details, location, and delivery defaults."
        maxWidth="xl"
        headerActions={
          <Button type="button" variant="ghost" asChild>
            <Link href="/">Back to Portfolio</Link>
          </Button>
        }
      >
        <CreateProjectForm />
      </ProjectFormPageLayout>
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
            hint={field.description}
            error={error}
            className="rounded-md border border-input bg-background px-4 py-4"
          />
        </div>
      );
    }

    if (field.control === "file") {
      const file =
        typeof File !== "undefined" && currentValue instanceof File ? currentValue : null;

      return (
        <FileUploadField
          key={`${field.name}-${fileResetKey}`}
          label={field.label}
          hint={field.description}
          error={error}
          accept={field.accept}
          maxFiles={1}
          variant="minimal"
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
      section.id === "project-status" ? 3 : activeLayout === "single-column" ? 1 : 2;

    return (
      <StandardFormSection
        key={section.id}
        title={section.title}
        description={section.description}
      >
        <FormGrid columns={sectionColumns}>{section.fields.map(renderField)}</FormGrid>
      </StandardFormSection>
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

      <Form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {effectiveFormSections.length > 0 ? (
          effectiveFormSections.map(renderSection)
        ) : (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No fields are currently visible for the selected template.
          </div>
        )}

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
