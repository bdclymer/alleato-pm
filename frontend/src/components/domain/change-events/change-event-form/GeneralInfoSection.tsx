"use client";

import { useEffect, useState } from "react";

import {
  FormGrid,
  FormSection,
  RichTextField,
  SelectField,
  TextField,
} from "@/components/forms";
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

interface OriginOption {
  id: string;
  label: string;
  number: string | null;
  status: string | null;
}

interface GeneralInfoSectionProps {
  formData: ChangeEventFormData;
  errors: Partial<Record<keyof ChangeEventFormData, string>>;
  updateFormData: (updates: Partial<ChangeEventFormData>) => void;
  primeContractSelectOptions: Array<{ value: string; label: string }>;
  hasPrimeContracts: boolean;
  projectId: number;
}

export function GeneralInfoSection({
  formData,
  errors,
  updateFormData,
  primeContractSelectOptions,
  hasPrimeContracts,
  projectId,
}: GeneralInfoSectionProps) {
  const [originRecordOptions, setOriginRecordOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingOriginRecords, setLoadingOriginRecords] = useState(false);

  useEffect(() => {
    if (!formData.origin) {
      setOriginRecordOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingOriginRecords(true);

    fetch(`/api/projects/${projectId}/change-events/origin-options?type=${formData.origin}`)
      .then((res) => res.json())
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
          value={formData.contractNumber}
          onChange={(e) => updateFormData({ contractNumber: e.target.value })}
          placeholder="Auto-generated"
          error={errors.contractNumber}
        />
        <TextField
          label="Title"
          required
          value={formData.title}
          onChange={(e) => updateFormData({ title: e.target.value })}
          placeholder="Enter title"
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
          value={formData.origin || ""}
          onValueChange={(value) => {
            updateFormData({ origin: value as ChangeEventOrigin, originId: undefined });
          }}
          placeholder="Select Origin"
        />
        {formData.origin && (
          <SelectField
            label="Origin Record"
            options={originRecordOptions}
            value={formData.originId || ""}
            onValueChange={(value) => updateFormData({ originId: value })}
            placeholder={loadingOriginRecords ? "Loading..." : `Select ${ORIGIN_OPTIONS.find((o) => o.value === formData.origin)?.label || "record"}`}
            disabled={loadingOriginRecords || originRecordOptions.length === 0}
          />
        )}
        <SelectField
          label="Type"
          options={TYPE_OPTIONS}
          value={formData.type || ""}
          onValueChange={(value) => updateFormData({ type: value as ChangeEventType })}
          placeholder="Select Type"
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
          label="Line Item Revenue Source"
          options={REVENUE_SOURCE_OPTIONS}
          value={formData.lineItemRevenueSource || ""}
          onValueChange={(value) => updateFormData({ lineItemRevenueSource: value })}
          placeholder="Select Revenue Source"
        />
        <SelectField
          label="Prime Contract For Markup Estimates"
          options={primeContractSelectOptions}
          value={formData.primeContractId || ""}
          onValueChange={(value) => updateFormData({ primeContractId: value })}
          placeholder="Select Prime Contract"
          disabled={!hasPrimeContracts}
        />

        <div className="md:col-span-3">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Expecting Revenue</label>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="expectingRevenue"
                  checked={formData.expectingRevenue === true}
                  onChange={() => updateFormData({ expectingRevenue: true })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="expectingRevenue"
                  checked={formData.expectingRevenue === false}
                  onChange={() => updateFormData({ expectingRevenue: false })}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">No</span>
              </label>
            </div>
          </div>
        </div>
        <div className="md:col-span-3">
          <RichTextField
            label="Description"
            value={formData.description || ""}
            onChange={(value) => updateFormData({ description: value })}
            placeholder="Describe the change event"
          />
        </div>
      </FormGrid>
    </FormSection>
  );
}
