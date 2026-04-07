"use client";

import { FormSection } from "@/components/forms/FormSection";
import { RichTextField } from "@/components/forms/RichTextField";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import type { ChangeEventFormData } from "./ChangeEventForm";

interface ChangeEventGeneralSectionProps {
  data: Partial<ChangeEventFormData>;
  onChange: (updates: Partial<ChangeEventFormData>) => void;
  errors?: Partial<Record<keyof ChangeEventFormData, string>>;
  projectId: number;
}

export function ChangeEventGeneralSection({
  data,
  onChange,
  errors,
}: ChangeEventGeneralSectionProps) {
  // Standard status options (typically used in Procore)
  const statusOptions = [
    { value: "open", label: "Open" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "closed", label: "Closed" },
  ];

  // Origin options (source of the change event)
  const originOptions = [
    { value: "owner", label: "Owner" },
    { value: "architect", label: "Architect" },
    { value: "contractor", label: "Contractor" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "inspector", label: "Inspector" },
    { value: "field_conditions", label: "Field Conditions" },
    { value: "rfi", label: "RFI" },
    { value: "design_change", label: "Design Change" },
    { value: "code_compliance", label: "Code Compliance" },
    { value: "other", label: "Other" },
  ];

  // Type options (nature of the change)
  const typeOptions = [
    { value: "allowance", label: "Allowance" },
    { value: "owner_change", label: "Owner Change" },
    { value: "design_error", label: "Design Error/Omission" },
    { value: "unforeseen_conditions", label: "Unforeseen Conditions" },
    { value: "code_requirement", label: "Code Requirement" },
    { value: "constructability", label: "Constructability Issue" },
    { value: "value_engineering", label: "Value Engineering" },
    { value: "schedule_impact", label: "Schedule Impact" },
    { value: "other", label: "Other" },
  ];

  // Change reason options (specific justification)
  const changeReasonOptions = [
    { value: "allowance", label: "Allowance" },
    { value: "client_request", label: "Client Request" },
    { value: "design_development", label: "Design Development" },
    { value: "differing_site_conditions", label: "Differing Site Conditions" },
    { value: "errors_and_omissions", label: "Errors and Omissions" },
    { value: "regulatory_requirement", label: "Regulatory Requirement" },
    { value: "scope_clarification", label: "Scope Clarification" },
    { value: "substitution", label: "Substitution" },
    { value: "schedule_acceleration", label: "Schedule Acceleration" },
    { value: "weather_delay", label: "Weather Delay" },
    { value: "other", label: "Other" },
  ];

  // Scope options (whether in or out of scope)
  const scopeOptions = [
    { value: "in_scope", label: "In Scope" },
    { value: "out_of_scope", label: "Out of Scope" },
    { value: "tbd", label: "To Be Determined" },
  ];

  return (
    <>
      <FormSection
        title="Core Details"
        description="Capture the key identifiers and classification for this change event."
      >
        <TextField
          label="Number"
          name="number"
          value={data.number || ""}
          onChange={(e) => onChange({ number: e.target.value })}
          required
          placeholder="CE-001"
          data-testid="change-event-number-input"
          error={errors?.number}
        />

        <TextField
          label="Title"
          name="title"
          value={data.title || ""}
          onChange={(e) => onChange({ title: e.target.value })}
          required
          fullWidth
          placeholder="Brief description of the change"
          data-testid="change-event-title-input"
          error={errors?.title}
        />

        <SelectField
          label="Status"
          options={statusOptions}
          value={data.status || "open"}
          onValueChange={(value) => onChange({ status: value })}
          required
          error={errors?.status}
          dataTestId="change-event-status-select"
        />

        <SelectField
          label="Origin"
          options={originOptions}
          value={data.origin}
          onValueChange={(value) => onChange({ origin: value })}
          placeholder="Select the source of this change"
        />

        <SelectField
          label="Type"
          options={typeOptions}
          value={data.type}
          onValueChange={(value) => onChange({ type: value })}
          placeholder="Select the type of change"
        />

        <SelectField
          label="Change Reason"
          options={changeReasonOptions}
          value={data.changeReason}
          onValueChange={(value) => onChange({ changeReason: value })}
          placeholder="Select the reason for this change"
        />

        <SelectField
          label="Scope"
          options={scopeOptions}
          value={data.scope}
          onValueChange={(value) => onChange({ scope: value })}
          placeholder="Select scope classification"
        />
      </FormSection>

      <FormSection
        title="Details"
        description="Add supporting narrative for this change event."
      >
        <RichTextField
          label="Description"
          value={data.description || ""}
          onChange={(value) => onChange({ description: value })}
          placeholder="Detailed description of the change event..."
          fullWidth
        />
      </FormSection>
    </>
  );
}
