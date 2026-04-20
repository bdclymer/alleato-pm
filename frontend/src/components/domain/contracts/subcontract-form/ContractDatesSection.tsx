"use client";

import { Controller, useFormContext } from "react-hook-form";
import { DateField } from "@/components/forms/DateField";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface ContractDatesSectionProps {
  isSubmitting: boolean;
}

export function ContractDatesSection({ isSubmitting }: ContractDatesSectionProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateSubcontractInput>();

  return (
    <section className="space-y-4 border-b border-border/70 pb-8">
      <SectionRuleHeading label="Contract Dates" />
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Controller
            name="dates.startDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Start Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select start date"
                error={errors.dates?.startDate?.message}
              />
            )}
          />

          <Controller
            name="dates.estimatedCompletionDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Estimated Completion Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select estimated completion"
                error={errors.dates?.estimatedCompletionDate?.message}
              />
            )}
          />
          <Controller
            name="dates.actualCompletionDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Actual Completion Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select actual completion"
                error={errors.dates?.actualCompletionDate?.message}
              />
            )}
          />

          <Controller
            name="dates.contractDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Contract Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select contract date"
                error={errors.dates?.contractDate?.message}
              />
            )}
          />

          <Controller
            name="dates.signedContractReceivedDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Signed Contract Received Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select signed contract received"
                error={errors.dates?.signedContractReceivedDate?.message}
              />
            )}
          />

          <Controller
            name="dates.issuedOnDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Issued On Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select issued on date"
                error={errors.dates?.issuedOnDate?.message}
              />
            )}
          />
        </div>
      </div>
    </section>
  );
}
