"use client";
import { ProjectFormPageLayout } from "@/components/layout";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TableLayout } from "@/components/layouts";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChangeEventForm,
  ChangeEventFormData,
} from "@/components/domain/change-events/ChangeEventForm";
import { ChangeEvent } from "@/hooks/use-change-events";
import { toast } from "sonner";
export default function EditChangeEventPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = parseInt(params.projectId as string, 10);
  const changeEventId = params.changeEventId as string; // UUID string, not a number
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [changeEvent, setChangeEvent] = useState<ChangeEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchChangeEvent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/projects/${projectId}/change-events/${changeEventId}`,
        );
        if (!response.ok) {
          throw new Error(
            `Failed to load change event: ${response.statusText}`,
          );
        }
        const data = await response.json();
        setChangeEvent(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load change event",
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (projectId && changeEventId) {
      fetchChangeEvent();
    }
  }, [projectId, changeEventId]);
  const handleSubmit = async (data: ChangeEventFormData) => {
    setIsSaving(true);
    try {
      const REASON_MAP: Record<string, string> = {
        allowance: "Allowance",
        backcharge: "Backcharge",
        client_request: "Client Request",
        design_development: "Design Development",
        existing_condition: "Existing Condition",
      };

      const response = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId,
            number: data.number,
            title: data.title,
            status: data.status,
            reason: REASON_MAP[data.changeReason || ""] || data.changeReason || null,
            scope: data.scope || null,
            description: data.description || null,
            notes: data.notes || null,
            estimated_impact: data.estimatedImpact || null,
          }),
        },
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }
      toast.success("Change event updated successfully");
      router.push(`/${projectId}/change-events/${changeEventId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update change event",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const handleCancel = () => {
    router.push(`/${projectId}/change-events/${changeEventId}`);
  };
  if (isLoading) {
    return (
      <ProjectFormPageLayout
        title="Edit Change Event"
        description="Loading change event..."
        maxWidth="3xl"
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Loading change event...</p>
          </div>
        </div>
      </ProjectFormPageLayout>
    );
  }
  if (error || !changeEvent) {
    return (
      <ProjectFormPageLayout
        title="Edit Change Event"
        description="Unable to load change event"
        maxWidth="3xl"
      >
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-destructive">{error || "Change event not found"}</p>
            <Button
              variant="outline"
              onClick={() => router.push(`/${projectId}/change-events`)}
            >
              Back to Change Events
            </Button>
          </div>
        </div>
      </ProjectFormPageLayout>
    );
  }

  // Check if change event can be edited
  const canEdit = ["open", "rejected"].includes(
    changeEvent.status?.toLowerCase() || "",
  );

  if (!canEdit) {
    return (
      <ProjectFormPageLayout
          title="Cannot Edit Change Event"
          description={`Change Event ${changeEvent.number || changeEvent.id} cannot be edited`}
          maxWidth="3xl"
          headerActions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          }
      >
        <TableLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Change events with status "{changeEvent.status}" cannot be
                edited.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Only change events with status "Open" or "Rejected" can be
                edited.
              </p>
              <Button
                onClick={() =>
                  router.push(`/${projectId}/change-events/${changeEventId}`)
                }
              >
                View Change Event
              </Button>
            </div>
          </div>
        </TableLayout>
      </ProjectFormPageLayout>
    );
  }

  const initialData: Partial<ChangeEventFormData> = {
    number: changeEvent.number || "",
    title: changeEvent.title || "",
    status: changeEvent.status || "open",
    origin: changeEvent.reason || undefined, // Note: API may have different field mapping
    changeReason: changeEvent.reason || undefined,
    scope: changeEvent.scope || undefined,
    description: changeEvent.description || undefined,
    notes: changeEvent.notes || undefined,
    estimatedImpact: changeEvent.estimated_impact || undefined,
  };

  return (
    <ProjectFormPageLayout
        title="Edit Change Event"
        description={`Modify Change Event ${changeEvent.number || changeEvent.id}`}
        maxWidth="3xl"
        headerActions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
    >
      <TableLayout>
        <ChangeEventForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSaving}
          mode="edit"
          projectId={projectId}
        />
      </TableLayout>
    </ProjectFormPageLayout>
  );
}
