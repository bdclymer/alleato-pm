"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { DevAutoFillButton } from "@/hooks/use-dev-autofill";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/forms/Form";

import { ChangeEventGeneralSection } from "./ChangeEventGeneralSection";

export interface ChangeEventFormData {
  // General Info
  number: string;
  title: string;
  status: string;
  origin?: string;
  type?: string;
  changeReason?: string;
  scope?: string;

  // Revenue configuration
  expectingRevenue?: boolean;
  lineItemRevenueSource?: string;
  primeContractId?: string;

  // Optional fields
  description?: string;
  notes?: string;
  estimatedImpact?: number;
}

interface ChangeEventFormProps {
  initialData?: Partial<ChangeEventFormData>;
  onSubmit: (data: ChangeEventFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: number;
}

export function ChangeEventForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ChangeEventFormProps) {
  const [formData, setFormData] = React.useState<Partial<ChangeEventFormData>>(
    initialData || {},
  );
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ChangeEventFormData, string>>
  >({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof ChangeEventFormData, string>> = {};

    if (!formData.number?.trim()) {
      nextErrors.number = "Number is required";
    }
    if (!formData.title?.trim()) {
      nextErrors.title = "Title is required";
    }
    if (!formData.status?.trim()) {
      nextErrors.status = "Status is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(formData as ChangeEventFormData);
  };

  const updateFormData = (updates: Partial<ChangeEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      if (!Object.keys(updates).length) {
        return prev;
      }
      const cleared = { ...prev };
      (Object.keys(updates) as Array<keyof ChangeEventFormData>).forEach(
        (key) => {
          delete cleared[key];
        },
      );
      return cleared;
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <ChangeEventGeneralSection
          data={formData}
          onChange={updateFormData}
          errors={errors}
          projectId={projectId}
        />
      </div>

      <div className="flex justify-between items-center gap-4 border-t pt-6">
        <DevAutoFillButton
          formType="changeEvent"
          onAutoFill={(data) =>
            updateFormData(data as Partial<ChangeEventFormData>)
          }
        />
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="change-event-submit-button"
          >
            {isSubmitting ? (
              <>
                <span className="mr-2">Saving...</span>
                <Loader2 className="h-4 w-4 animate-spin" />
              </>
            ) : mode === "create" ? (
              "Create Change Event"
            ) : (
              "Update Change Event"
            )}
          </Button>
        </div>
      </div>
    </Form>
  );
}
