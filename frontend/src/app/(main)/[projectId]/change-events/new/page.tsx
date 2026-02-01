"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageContainer } from "@/components/layout";
import { FormLayout, DashboardFormLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
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
      const response = await fetch(`/api/projects/${projectId}/change-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          number: data.number,
          title: data.title,
          status: data.status || "open",
          reason: data.changeReason || null,
          scope: data.scope || "TBD",
          notes: data.notes || null,
          description: data.description || null,
          estimated_impact: data.estimatedImpact || null,
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
    <DashboardFormLayout maxWidth="wide">
      <PageHeader
        title="Create Change Event"
        description="Document a potential change to the project scope, schedule, or budget."
        breadcrumbs={[
          { label: "Projects", href: "/" },
          { label: "Change Events", href: `/${projectId}/change-events` },
          { label: "New Change Event" },
        ]}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
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
    </DashboardFormLayout>
  );
}
