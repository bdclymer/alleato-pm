"use client";

import { useEffect, useState } from "react";

import {
  FormGrid,
  FormSection,
  RichTextField,
  SelectField,
  TextField,
} from "@/components/forms";
import { apiFetch } from "@/lib/api-client";
import type {
  ChangeEventFormData,
  ChangeEventStatus,
  ChangeEventOrigin,
  ChangeEventType,
  ChangeReason,
} from "./types";
import {
  STATUS_OPTIONS,
  ORIGIN_OPTIONS,
  TYPE_OPTIONS,
  CHANGE_REASON_OPTIONS,
  SCOPE_OPTIONS,
  REVENUE_SOURCE_OPTIONS,
} from "./types";

const EXPECTING_REVENUE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

interface OriginOption {
  id: string;
  label: string;
  number: string | null;
  status: string | null;
}

interface GeneralInfoSectionProps {
  formData: ChangeEventFormData;
  nextNumber?: string;
  errors: Partial<Record<keyof ChangeEventFormData, string>>;
  updateFormData: (updates: Partial<ChangeEventFormData>) => void;
  primeContractSelectOptions: Array<{ value: string; label: string }>;
  hasPrimeContracts: boolean;
  projectId: number;
  showDescription?: boolean;
}

export function GeneralInfoSection({
  formData,
  nextNumber,
  errors,
  updateFormData,
  primeContractSelectOptions,
  hasPrimeContracts,
  projectId,
  showDescription = true,
}: GeneralInfoSectionProps) {
  const [originRecordOptions, setOriginRecordOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingOriginRecords, setLoadingOriginRecords] = useState(false);
  const expectingRevenue = formData.expectingRevenue !== false;

  useEffect(() => {
    if (!formData.origin) {
      setOriginRecordOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingOriginRecords(true);

    apiFetch<{ data?: OriginOption[] }>(
      `/api/projects/${projectId}/change-events/origin-options?type=${formData.origin}`,
    )
      .then((json) => {
        if (cancelled) return;
        const options = (json.data || []).map((opt: OriginOption) => ({
          value: opt.id,
          label: opt.label,
        }));
        setOriginRecordOptions(options);
      })
      .catch(() => {
        if (!cancelled) setOriginRecordOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingOriginRecords(false);
      });

    return () => { cancelled = true; };
  }, [formData.origin, projectId]);
  return (
    <FormSection title="General Information">
      <FormGrid columns={3}>
        <TextField
          label="Number"
          value={formData.contractNumber || nextNumber || ""}
          onChange={(e) => updateFormData({ contractNumber: e.target.value })}
          placeholder={nextNumber ? nextNumber : "Auto-generated"}
          disabled={!formData.contractNumber && !!nextNumber}
          error={errors.contractNumber}
        />
        <TextField
          label="Title"
          required
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="e.g. Added storefront blocking"
          error={errors.title}
        />
        <SelectField
          label="Status"
          required
          options={STATUS_OPTIONS}
          value={formData.status}
          onValueChange={(value) => updateFormData({ status: value as ChangeEventStatus })}
          error={errors.status}
        />

        <SelectField
          label="Origin"
          options={ORIGIN_OPTIONS}
          value={formData.origin || undefined}
          onValueChange={(value) => {
            updateFormData({ origin: value as ChangeEventOrigin, originId: undefined });
          }}
          placeholder="Select Origin"
        />
        {formData.origin && (
          <SelectField
            label="Origin Record"
            options={originRecordOptions}
            value={formData.originId || undefined}
            onValueChange={(value) => updateFormData({ originId: value })}
            placeholder={loadingOriginRecords ? "Loading..." : `Select ${ORIGIN_OPTIONS.find((o) => o.value === formData.origin)?.label || "record"}`}
            disabled={loadingOriginRecords || originRecordOptions.length === 0}
          />
        )}
        <SelectField
          label="Type"
          required
          options={TYPE_OPTIONS}
          value={formData.type || ""}
          onValueChange={(value) => updateFormData({ type: value as ChangeEventType })}
          placeholder="Select Type"
          error={errors.type}
        />
        <SelectField
          label="Change Reason"
          options={CHANGE_REASON_OPTIONS}
          value={formData.changeReason || ""}
          onValueChange={(value) => updateFormData({ changeReason: value as ChangeReason })}
          placeholder="Select Change Reason"
        />

        <SelectField
          label="Scope"
          options={SCOPE_OPTIONS}
          value={formData.scope || ""}
          onValueChange={(value) => updateFormData({ scope: value })}
          placeholder="Select Scope"
        />
        <SelectField
          label="Expecting Revenue"
          options={EXPECTING_REVENUE_OPTIONS}
          value={expectingRevenue ? "yes" : "no"}
          onValueChange={(value) => updateFormData({ expectingRevenue: value === "yes" })}
        />
        {expectingRevenue && (
          <SelectField
            label="Line Item Revenue Source"
            options={REVENUE_SOURCE_OPTIONS}
            value={formData.lineItemRevenueSource || ""}
            onValueChange={(value) => updateFormData({ lineItemRevenueSource: value })}
            placeholder="Select Revenue Source"
            labelTooltip="Match Cost: auto-copies cost to revenue. Enter Manually: type revenue per line. Qty × Unit Cost: calculates from those fields."
          />
        )}
        <SelectField
          label="Prime Contract (markup basis)"
          options={primeContractSelectOptions}
          value={formData.primeContractId || ""}
          onValueChange={(value) => updateFormData({ primeContractId: value })}
          placeholder={
            hasPrimeContracts
              ? "Select Prime Contract"
              : "No prime contract on this project"
          }
          disabled={!hasPrimeContracts}
          hint={
            hasPrimeContracts
              ? undefined
              : "Add a prime contract to this project to use it as the markup basis."
          }
        />
        {showDescription && (
          <div className="md:col-span-3">
            <RichTextField
              label="Description"
              value={formData.description || ""}
              onChange={(value) => updateFormData({ description: value })}
              placeholder="e.g. Added storefront blocking at the main entry."
            />
          </div>
        )}
      </FormGrid>
    </FormSection>
  );
}
