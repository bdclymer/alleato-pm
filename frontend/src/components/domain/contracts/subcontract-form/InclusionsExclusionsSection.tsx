"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";
import { SectionRuleHeading } from "@/components/layout/spacing";

interface InclusionsExclusionsSectionProps {
  isSubmitting: boolean;
}

export function InclusionsExclusionsSection({
  isSubmitting,
}: InclusionsExclusionsSectionProps) {
  const { control } = useFormContext<CreateSubcontractInput>();

  return (
    <section className="space-y-4">
      <SectionRuleHeading label="Inclusions & Exclusions" />
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Inclusions</Label>
          <Controller
            name="inclusions"
            control={control}
            render={({ field }) => (
              <Textarea
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter scope inclusions..."
                rows={3}
              />
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Exclusions</Label>
          <Controller
            name="exclusions"
            control={control}
            render={({ field }) => (
              <Textarea
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={isSubmitting}
                placeholder="Enter scope exclusions..."
                rows={3}
              />
            )}
          />
        </div>
      </div>
    </section>
  );
}
