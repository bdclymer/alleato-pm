"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TableLayout } from "@/components/layouts";
import { PageHeader } from "@/components/layout";
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
  const changeEventId = params.id as string; // UUID string, not a number
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
            reason: data.changeReason || null,
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
      <div className="flex items-center justify-center h-64">
        {" "}
        <div className="text-center">
          {" "}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>{" "}
          <p className="text-muted-foreground">Loading change event...</p>{" "}
        </div>{" "}
      </div>
    );
  }
  if (error || !changeEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        {" "}
        <div className="text-center">
          {" "}
          <p className="text-destructive mb-4">
            {error || "Change event not found"}
          </p>{" "}
          <Button
            variant="outline"
            onClick={() => router.push(`/${projectId}/change-events`)}
          >
            {" "}
            Back to Change Events{" "}
          </Button>{" "}
        </div>{" "}
      </div>
    );
  }

  // Check if change event can be edited
  const canEdit = ["open", "rejected"].includes(
    changeEvent.status?.toLowerCase() || "",
  );

  if (!canEdit) {
    return (
      <>
        <PageHeader
          title="Cannot Edit Change Event"
          description={`Change Event ${changeEvent.number || changeEvent.id} cannot be edited`}
          breadcrumbs={[
            { label: "Projects", href: "/" },
            { label: "Change Events", href: `/${projectId}/change-events` },
            { label: changeEvent.number || `CE-${changeEvent.id}` },
            { label: "Edit" },
          ]}
          actions={
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          }
        />
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
      </>
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
    <>
      <PageHeader
        title="Edit Change Event"
        description={`Modify Change Event ${changeEvent.number || changeEvent.id}`}
        breadcrumbs={[
          { label: "Projects", href: "/" },
          { label: "Change Events", href: `/${projectId}/change-events` },
          {
            label: changeEvent.number || `CE-${changeEvent.id}`,
            href: `/${projectId}/change-events/${changeEventId}`,
          },
          { label: "Edit" },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />
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
    </>
  );
}
