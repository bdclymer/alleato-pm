"use client";

import type { ReactElement } from "react";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormSection } from "@/components/forms/FormSection";
import { FormGrid } from "@/components/forms/FormGrid";
import { FormLayoutProvider } from "@/components/forms/FormField";
import { TextField } from "@/components/forms/TextField";
import { SelectField } from "@/components/forms/SelectField";
import { NumberField } from "@/components/forms/NumberField";

/**
 * Form state for FM Global specs input.
 */
export interface FormState {
  contactName: string;
  contactEmail: string;
  projectName: string;
  projectLocation: string;
  asrsType: string;
  ceilingHeight: string;
  commodityClass: string;
  kFactor: string;
  containerType: string;
  storageHeight: string;
  rackRowDepth: string;
}

/**
 * Default form values for FM Global specs input.
 */
export const defaultFormState: FormState = {
  contactName: "",
  contactEmail: "",
  projectName: "",
  projectLocation: "",
  asrsType: "Shuttle",
  ceilingHeight: "",
  commodityClass: "",
  kFactor: "",
  containerType: "unspecified",
  storageHeight: "",
  rackRowDepth: "",
};

const asrsOptions = [
  { value: "Shuttle", label: "Shuttle" },
  { value: "Mini-Load", label: "Mini-Load" },
  { value: "Top-Loading", label: "Top-Loading" },
  { value: "Vertically-Enclosed", label: "Vertically-Enclosed" },
  { value: "All", label: "All" },
];

const containerOptions = [
  { value: "unspecified", label: "Not specified" },
  { value: "Closed-Top", label: "Closed-Top" },
  { value: "Open-Top", label: "Open-Top" },
  { value: "Noncombustible", label: "Noncombustible" },
  { value: "Plastic", label: "Plastic" },
  { value: "Mixed", label: "Mixed" },
];

/**
 * Existing ceiling sprinkler K-factor options. The value stored is the numeric
 * K-factor; the label is the human-readable form used on the FM Global tables.
 */
export const kFactorOptions = [
  { value: "16.8", label: "K 16.8" },
  { value: "22.4", label: "K 22.4" },
  { value: "25.2", label: "K 25.2" },
];

interface FmGlobalFormProps {
  formState: FormState;
  onFormChange: (state: FormState) => void;
  onSubmit: () => void;
  isPending: boolean;
  errorMessage: string | null;
}

function numToString(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function ErrorBanner({ message }: { message: string | null }): ReactElement | null {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

/**
 * FM Global specification input form, styled to match the Alleato design system.
 */
export function FmGlobalForm({
  formState,
  onFormChange,
  onSubmit,
  isPending,
  errorMessage,
}: FmGlobalFormProps): ReactElement {
  const update = (patch: Partial<FormState>) =>
    onFormChange({ ...formState, ...patch });

  return (
    <Form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="[&_label.w-28]:!w-72"
    >
      <FormLayoutProvider layout="horizontal">
      <FormSection title="Your Details">
        <FormGrid columns={1}>
          <TextField
            label="Name"
            value={formState.contactName}
            onChange={(event) => update({ contactName: event.target.value })}
            placeholder="Jane Doe"
            autoComplete="name"
            required
          />
          <TextField
            label="Email"
            value={formState.contactEmail}
            onChange={(event) => update({ contactEmail: event.target.value })}
            placeholder="you@company.com"
            autoComplete="email"
            inputMode="email"
            required
          />
          <TextField
            label="Project Name"
            value={formState.projectName}
            onChange={(event) => update({ projectName: event.target.value })}
            placeholder="e.g. Atlanta Distribution Center"
            required
          />
          <TextField
            label="Project Location"
            value={formState.projectLocation}
            onChange={(event) =>
              update({ projectLocation: event.target.value })
            }
            placeholder="City, State / Country"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="System Classification">
        <FormGrid columns={1}>
          <SelectField
            label="ASRS Type"
            options={asrsOptions}
            value={formState.asrsType}
            onValueChange={(value) => update({ asrsType: value })}
            placeholder="Select ASRS type"
            required
          />
          <SelectField
            label="Container Type"
            options={containerOptions}
            value={formState.containerType}
            onValueChange={(value) => update({ containerType: value })}
            placeholder="Select container type"
          />
        </FormGrid>
      </FormSection>

      <FormSection title="Building & Storage">
        <FormGrid columns={1}>
          <NumberField
            label="Ceiling Height (ft)"
            value={
              formState.ceilingHeight === ""
                ? undefined
                : Number(formState.ceilingHeight)
            }
            onChange={(value) => update({ ceilingHeight: numToString(value) })}
            min={1}
            required
          />
          <NumberField
            label="Storage Height (ft)"
            value={
              formState.storageHeight === ""
                ? undefined
                : Number(formState.storageHeight)
            }
            onChange={(value) => update({ storageHeight: numToString(value) })}
            min={0}
          />
          <NumberField
            label="Rack Row Depth (ft)"
            value={
              formState.rackRowDepth === ""
                ? undefined
                : Number(formState.rackRowDepth)
            }
            onChange={(value) => update({ rackRowDepth: numToString(value) })}
            min={0}
          />
          <TextField
            label="Commodity Class"
            value={formState.commodityClass}
            onChange={(event) => update({ commodityClass: event.target.value })}
            placeholder="Class 1-4, Plastic, etc."
          />
          <SelectField
            label="Existing Ceiling Sprinkler K-Factor"
            options={kFactorOptions}
            value={formState.kFactor}
            onValueChange={(value) => update({ kFactor: value })}
            placeholder="Select K-factor"
            required
          />
        </FormGrid>
      </FormSection>

      </FormLayoutProvider>

      <ErrorBanner message={errorMessage} />

      <FormActions
        submitLabel="Submit Requirements"
        isSubmitting={isPending}
      />
    </Form>
  );
}
