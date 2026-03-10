"use client";

import { useState, useEffect } from "react";
import { FormSection } from "@/components/forms/FormSection";
import { SelectField } from "@/components/forms/SelectField";
import { ToggleField } from "@/components/forms/ToggleField";
import type { ChangeEventFormData } from "./ChangeEventForm";

interface ChangeEventRevenueSectionProps {
  data: Partial<ChangeEventFormData>;
  onChange: (updates: Partial<ChangeEventFormData>) => void;
  projectId: number;
}

// Map UI slug values to display values — must match the API's LineItemRevenueSource enum:
// "Match Latest Cost" | "Latest Cost" | "Latest Price"
const REVENUE_SOURCE_SLUG_TO_DISPLAY: Record<string, string> = {
  match_latest_cost: "Match Latest Cost",
  latest_cost: "Latest Cost",
  latest_price: "Latest Price",
};

const REVENUE_SOURCE_DISPLAY_TO_SLUG: Record<string, string> = {
  "Match Latest Cost": "match_latest_cost",
  "Latest Cost": "latest_cost",
  "Latest Price": "latest_price",
};

export function ChangeEventRevenueSection({
  data,
  onChange,
  projectId,
}: ChangeEventRevenueSectionProps) {
  // Revenue source options — values must match the API's LineItemRevenueSource enum
  const revenueSourceOptions = [
    { value: "match_latest_cost", label: "Match Revenue to Latest Cost" },
    { value: "latest_cost", label: "Latest Cost" },
    { value: "latest_price", label: "Latest Price" },
  ];

  // State for prime contracts
  const [primeContractOptions, setPrimeContractOptions] = useState<
    { value: string; label: string }[]
  >([]);

  // Fetch prime contracts
  useEffect(() => {
    const fetchPrimeContracts = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/contracts`);
        if (response.ok) {
          const contractData = await response.json();
          const records = Array.isArray(contractData)
            ? contractData
            : Array.isArray(contractData?.data)
              ? contractData.data
              : Array.isArray(contractData?.contracts)
                ? contractData.contracts
                : [];
          const contracts = records.map(
            (contract: {
              id: number | string;
              contract_number?: string;
              number?: string;
              title?: string;
              description?: string;
            }) => ({
              value: contract.id.toString(),
              label: `${contract.contract_number || contract.number || ""} - ${contract.title || contract.description || "Unknown"}`,
            }),
          );
          setPrimeContractOptions(contracts);
        }
      } catch (error) {

        console.error("Failed to process revenue data:", error);

        // Intentionally swallowed: error handling done by caller

      }
    };

    if (projectId) {
      fetchPrimeContracts();
    }
  }, [projectId]);

  const expectingRevenue = data.expectingRevenue || false;

  // Convert DB display value back to slug for the select component
  const currentSlug = data.lineItemRevenueSource
    ? REVENUE_SOURCE_DISPLAY_TO_SLUG[data.lineItemRevenueSource] || data.lineItemRevenueSource
    : undefined;

  return (
    <FormSection
      title="Revenue Configuration"
      description="Configure how revenue will be calculated for this change event"
    >
      <ToggleField
        label="Expecting Revenue"
        checked={expectingRevenue}
        onCheckedChange={(checked) => onChange({ expectingRevenue: checked })}
      />

      {expectingRevenue && (
        <>
          <SelectField
            label="Line Item Revenue Source"
            options={revenueSourceOptions}
            value={currentSlug}
            onValueChange={(value) =>
              onChange({
                lineItemRevenueSource: REVENUE_SOURCE_SLUG_TO_DISPLAY[value] || value
              })
            }
            placeholder="Select how revenue will be calculated"
            hint="This determines how revenue amounts are calculated for line items"
            required
          />

          {currentSlug === "match_latest_cost" && (
            <SelectField
              label="Prime Contract for Markup Estimates"
              options={primeContractOptions}
              value={data.primeContractId}
              onValueChange={(value) => onChange({ primeContractId: value })}
              placeholder="Select prime contract"
              hint="Used to determine markup percentage for revenue calculations"
              required
            />
          )}
        </>
      )}
    </FormSection>
  );
}
