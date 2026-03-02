"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { ChangeEventForm } from "@/components/domain/change-events/ChangeEventForm";
import type { ChangeEventFormData } from "@/components/domain/change-events/ChangeEventForm";

export default function NewChangeEventPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (data: ChangeEventFormData) => {
    setIsSaving(true);
    try {
      const SCOPE_MAP: Record<string, string> = {
        in_scope: "In Scope",
        out_of_scope: "Out of Scope",
        tbd: "TBD",
        allowance: "Allowance",
      };
      const TYPE_MAP: Record<string, string> = {
        allowance: "Allowance",
        owner_change: "Owner Change",
        design_error: "Design Change",
        unforeseen_conditions: "Unforeseen Condition",
        code_requirement: "Scope Gap",
        constructability: "Constructability Issue",
        value_engineering: "Value Engineering",
        schedule_impact: "Owner Requested",
        other: "Owner Change",
      };

      const response = await fetch(`/api/projects/${projectId}/change-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          type: TYPE_MAP[data.type || ""] || "Owner Change",
          scope: SCOPE_MAP[data.scope || ""] || "TBD",
          reason: data.changeReason || undefined,
          origin: undefined,
          description: data.description || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to create change event");
      }

      const newEvent = await response.json();

      toast.success("Change event created successfully");
      router.push(`/${projectId}/change-events/${newEvent.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create change event",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/${projectId}/change-events`);
  };

  const initialData: Partial<ChangeEventFormData> = {
    number: "",
    title: "",
    status: "open",
  };

  return (
    <>
      <ProjectPageHeader
        title="Create Change Event"
        description="Document a potential change to the project scope, schedule, or budget."
      />
      <PageContainer maxWidth="md">
        <ChangeEventForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSaving}
          mode="create"
          projectId={projectId}
        />
      </PageContainer>
    </>
  );
}
