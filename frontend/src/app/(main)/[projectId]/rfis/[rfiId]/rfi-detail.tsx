"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { useForm } from "react-hook-form";

import { RelatedItemsPanel } from "@/components/domain/related-items/RelatedItemsPanel";
import {
  DetailField,
  DetailFieldGrid,
  EditableDetailField,
  EditModeActions,
  EntityAttachments,
  EmptyState,
  Form,
  StatusBadge,
} from "@/components/ds";
import {
  ContentSectionStack,
  DetailPanel,
  SectionRuleHeading,
} from "@/components/layout";
import { apiFetch } from "@/lib/api-client";
import { RfiResponses } from "@/components/rfis/rfi-responses";
import { RfiFormFields } from "@/components/rfis/rfi-form-fields";
import { useUpdateRfi } from "@/hooks/use-rfis";
import {
  RFI_IMPACT_OPTIONS,
  rfiBaseSchema,
  type RfiFormValues,
} from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatStatusLabel(status: string): string {
  if (status === "closed-draft") return "Closed (Draft)";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const toDateInputValue = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : "";

const impactLabel = (value: string | null | undefined) =>
  RFI_IMPACT_OPTIONS.find((opt) => opt.value === value)?.label ?? value ?? undefined;

type ImportedRfiDocument = {
  project_document_id?: number | null;
  file_name?: string | null;
};

type ImportedRfiMetadata = {
  question_document?: ImportedRfiDocument | null;
  response_document?: ImportedRfiDocument | null;
};

function getImportedRfiMetadata(value: RFI["source_metadata"]): ImportedRfiMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as ImportedRfiMetadata;
}

function ImportedDocumentLink({
  label,
  documentId,
  fileName,
  projectId,
}: {
  label: string;
  documentId?: number | null;
  fileName?: string | null;
  projectId: number;
}) {
  if (!documentId) return null;

  return (
    <a
      href={`/api/projects/${projectId}/documents/${documentId}/download`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 rounded-md px-2 py-2 text-xs text-foreground transition-colors hover:bg-muted/60"
    >
      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block break-words text-muted-foreground">
          {fileName || `Document ${documentId}`}
        </span>
      </span>
      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface RfiDetailProps {
  rfi: RFI | null;
  projectId: number;
  isEditing?: boolean;
}

export function RfiDetail({ rfi, projectId, isEditing = false }: RfiDetailProps) {
  const router = useRouter();
  const updateRfi = useUpdateRfi(projectId);

  const form = useForm<RfiFormValues>({
    defaultValues: {
      subject: rfi?.subject ?? "",
      question: rfi?.question ?? "",
      due_date: rfi?.due_date ?? null,
      assignees: rfi?.assignees ?? [],
      rfi_manager: rfi?.rfi_manager ?? null,
      received_from: rfi?.received_from ?? null,
      responsible_contractor: rfi?.responsible_contractor ?? null,
      distribution_list: rfi?.distribution_list ?? [],
      location: rfi?.location ?? null,
      specification: rfi?.specification ?? null,
      cost_code: rfi?.cost_code ?? null,
      schedule_impact: rfi?.schedule_impact ?? null,
      cost_impact: rfi?.cost_impact ?? null,
      reference: rfi?.reference ?? null,
      is_private: rfi?.is_private ?? false,
      rfi_stage: rfi?.rfi_stage ?? null,
      drawing_number: rfi?.drawing_number ?? null,
    },
  });

  if (!rfi) {
    return (
      <EmptyState
        title="RFI not found"
        description="This RFI could not be found or may have been deleted."
      />
    );
  }

  const cancelUrl = `/${projectId}/rfis/${rfi.id}`;
  const importedMetadata = getImportedRfiMetadata(rfi.source_metadata);
  const hasImportedDocuments =
    Boolean(rfi.source_project_document_id) ||
    Boolean(rfi.response_project_document_id);

  // Validate manually (no resolver) so the form's value type stays aligned with
  // the shared RfiFormFields component — matches the create page's pattern.
  const submitEdit = async () => {
    const data = form.getValues();
    const result = rfiBaseSchema.safeParse(data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof RfiFormValues;
        if (path) form.setError(path, { message: issue.message });
      }
      return;
    }
    await updateRfi.mutateAsync({ rfiId: rfi.id, data: result.data });
    router.push(cancelUrl);
    router.refresh();
  };

  // Single-field inline save for the detail page (click-to-edit, like the
  // commitment/prime-contract detail pages). Throws on failure so InlineEditField
  // reverts + toasts.
  const saveField = async (field: string, value: string | null) => {
    await apiFetch(`/api/projects/${projectId}/rfis/${rfi.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  };

  // ── Edit mode — shared RFI form components ─────────────────────────────────

  if (isEditing) {
    return (
      <Form {...form}>
        <form className="space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Editing RFI #{rfi.number}
            </p>
            <EditModeActions
              isEditing
              onEdit={() => {}}
              onSave={submitEdit}
              onCancel={() => {
                form.reset();
                router.push(cancelUrl);
              }}
              isSaving={updateRfi.isPending}
            />
          </div>

          <RfiFormFields form={form} projectId={projectId} withFormProvider={false} />
        </form>
      </Form>
    );
  }

  // ── View mode — matches the commitment/contract detail layout ──────────────

  return (
    <ContentSectionStack className="pb-20">
      <DetailPanel>
        <SectionRuleHeading label="General Information" className="mb-6 pb-0" />
        <DetailFieldGrid columns={2}>
          <DetailField label="RFI #">{String(rfi.number ?? "—")}</DetailField>
          <DetailField label="Status">
            <StatusBadge status={formatStatusLabel(rfi.status ?? "open")} />
          </DetailField>

          <EditableDetailField
            label="Subject"
            span={2}
            value={rfi.subject ?? ""}
            onSave={(v) => saveField("subject", v)}
          />
          <EditableDetailField
            label="Question"
            span={2}
            type="textarea"
            value={rfi.question ?? ""}
            display={rfi.question || undefined}
            onSave={(v) => saveField("question", v)}
          />

          <EditableDetailField
            label="Stage"
            value={rfi.rfi_stage ?? ""}
            onSave={(v) => saveField("rfi_stage", v || null)}
          />
          <EditableDetailField
            label="Due Date"
            type="date"
            value={toDateInputValue(rfi.due_date)}
            display={rfi.due_date ? formatDate(rfi.due_date) : undefined}
            onSave={(v) => saveField("due_date", v || null)}
          />
          <DetailField label="Date Initiated">{formatDate(rfi.date_initiated)}</DetailField>
          <DetailField label="Closed Date">{formatDate(rfi.closed_date)}</DetailField>

          {/* People are picked from the directory in the Edit form (Procore
              model), not free-typed inline — so they stay read-only here. */}
          <DetailField label="RFI Manager">{rfi.rfi_manager}</DetailField>
          <DetailField label="Received From">{rfi.received_from}</DetailField>
          <DetailField label="Responsible Contractor">
            {rfi.responsible_contractor}
          </DetailField>
          <DetailField label="Assignees">
            {rfi.assignees?.length ? rfi.assignees.join(", ") : null}
          </DetailField>

          <EditableDetailField
            label="Location"
            value={rfi.location ?? ""}
            onSave={(v) => saveField("location", v || null)}
          />
          <EditableDetailField
            label="Drawing #"
            editLabel="Drawing Number"
            value={rfi.drawing_number ?? ""}
            onSave={(v) => saveField("drawing_number", v || null)}
          />
          <EditableDetailField
            label="Specification"
            value={rfi.specification ?? ""}
            onSave={(v) => saveField("specification", v || null)}
          />
          <EditableDetailField
            label="Cost Code"
            value={rfi.cost_code ?? ""}
            onSave={(v) => saveField("cost_code", v || null)}
          />
          <EditableDetailField
            label="Reference"
            value={rfi.reference ?? ""}
            onSave={(v) => saveField("reference", v || null)}
          />

          <EditableDetailField
            label="Schedule Impact"
            type="select"
            options={[...RFI_IMPACT_OPTIONS]}
            value={rfi.schedule_impact ?? ""}
            display={impactLabel(rfi.schedule_impact)}
            onSave={(v) => saveField("schedule_impact", v || null)}
          />
          <EditableDetailField
            label="Cost Impact"
            type="select"
            options={[...RFI_IMPACT_OPTIONS]}
            value={rfi.cost_impact ?? ""}
            display={impactLabel(rfi.cost_impact)}
            onSave={(v) => saveField("cost_impact", v || null)}
          />

          <DetailField label="Created By">{rfi.created_by}</DetailField>
          <DetailField label="Created">{formatDate(rfi.created_at)}</DetailField>
          <DetailField label="Private">{rfi.is_private ? "Yes" : "No"}</DetailField>

          {hasImportedDocuments && (
            <DetailField label="Imported Documents" span={2}>
              <div className="space-y-1">
                <ImportedDocumentLink
                  label="Question PDF"
                  documentId={rfi.source_project_document_id}
                  fileName={importedMetadata.question_document?.file_name}
                  projectId={projectId}
                />
                <ImportedDocumentLink
                  label="Response PDF"
                  documentId={rfi.response_project_document_id}
                  fileName={importedMetadata.response_document?.file_name}
                  projectId={projectId}
                />
              </div>
            </DetailField>
          )}

          <DetailField label="Attachments" span={2}>
            <EntityAttachments
              entityType="rfi"
              entityId={rfi.id}
              projectId={String(projectId)}
              showLabel={false}
            />
          </DetailField>
        </DetailFieldGrid>
      </DetailPanel>

      <DetailPanel>
        <RfiResponses rfiId={rfi.id} projectId={projectId} />
      </DetailPanel>

      <DetailPanel>
        <RelatedItemsPanel
          entityType="rfi"
          entityId={rfi.id}
          projectId={projectId}
          flat
        />
      </DetailPanel>
    </ContentSectionStack>
  );
}
