"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { RelatedItemsPanel } from "@/components/domain/related-items/RelatedItemsPanel";

import {
  Checkbox,
  DetailField,
  EditableDetailField,
  EditModeActions,
  EntityAttachments,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Textarea,
  EmptyState,
} from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import { RfiResponses } from "@/components/rfis/rfi-responses";
import { RHFComboboxField } from "@/components/forms/fields/RHFComboboxField";
import { RHFMultiComboboxField } from "@/components/forms/fields/RHFMultiComboboxField";
import { useRfiPeopleOptions } from "@/components/rfis/rfi-form-fields";
import { useUpdateRfi } from "@/hooks/use-rfis";
import {
  RFI_IMPACT_OPTIONS,
  rfiEditSchema,
  type RfiEditValues,
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

// ---------------------------------------------------------------------------
// Section eyebrow label
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
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
  const { userOptions, directoryOptions, companyForPerson, isLoading: isLoadingPeople } =
    useRfiPeopleOptions();

  const form = useForm<RfiEditValues>({
    resolver: zodResolver(rfiEditSchema),
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

  // Procore: Responsible Contractor is auto-prefilled (read-only) from the
  // company of the person chosen in Received From. Re-derive on change; skip the
  // initial mount so a saved value isn't clobbered on load.
  const receivedFrom = form.watch("received_from");
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    const company = receivedFrom
      ? companyForPerson.get(receivedFrom.toLowerCase()) ?? null
      : null;
    form.setValue("responsible_contractor", company, { shouldDirty: true });
  }, [receivedFrom, companyForPerson, form]);

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

  const handleSave = async (data: RfiEditValues) => {
    await updateRfi.mutateAsync({ rfiId: rfi.id, data });
    router.push(cancelUrl);
    router.refresh();
  };

  // Inline single-field save for the detail sidebar (matches the prime-contract
  // click-to-edit pattern). Throws on failure so InlineEditField reverts + toasts.
  const saveField = async (field: string, value: string | null) => {
    if (!rfi) return;
    await apiFetch(`/api/projects/${projectId}/rfis/${rfi.id}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  };

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <Form {...form}>
        <form className="space-y-10">
          {/* Edit mode header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Editing RFI #{rfi.number}
            </p>
            <EditModeActions
              isEditing
              onEdit={() => {}}
              onSave={form.handleSubmit(handleSave)}
              onCancel={() => {
                form.reset();
                router.push(cancelUrl);
              }}
              isSaving={updateRfi.isPending}
            />
          </div>

          {/* Core */}
          <div className="space-y-4">
            <SectionLabel>Core Details</SectionLabel>
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject *</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-32 resize-none"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Assignment */}
          <div className="space-y-4">
            <SectionLabel>Assignment</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <RHFComboboxField
                control={form.control}
                name="rfi_manager"
                label="RFI Manager"
                placeholder="Select RFI manager"
                searchPlaceholder="Search users..."
                emptyMessage="No matching user found."
                options={userOptions}
                disabled={isLoadingPeople}
                clearable
              />
              <RHFComboboxField
                control={form.control}
                name="received_from"
                label="Received From"
                placeholder="Select from directory"
                searchPlaceholder="Search directory..."
                emptyMessage="No matching person found."
                options={directoryOptions}
                disabled={isLoadingPeople}
                clearable
              />
              <FormField
                control={form.control}
                name="responsible_contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Contractor</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        disabled
                        placeholder="Auto-filled from Received From"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <RHFMultiComboboxField
                  control={form.control}
                  name="assignees"
                  label="Assignees"
                  options={userOptions}
                  placeholder="Select assignees"
                  searchPlaceholder="Search users..."
                  emptyMessage="No matching user found."
                  disabled={isLoadingPeople}
                />
              </div>
              <div className="sm:col-span-2">
                <RHFMultiComboboxField
                  control={form.control}
                  name="distribution_list"
                  label="Distribution List"
                  options={directoryOptions}
                  placeholder="Select from directory"
                  searchPlaceholder="Search directory..."
                  emptyMessage="No matching person found."
                  disabled={isLoadingPeople}
                />
              </div>
            </div>
          </div>

          {/* Location & Reference */}
          <div className="space-y-4">
            <SectionLabel>Location &amp; Reference</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="drawing_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drawing Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="e.g. A-101"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specification</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rfi_stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFI Stage</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Impact */}
          <div className="space-y-4">
            <SectionLabel>Impact</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="schedule_impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Impact</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFI_IMPACT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost_impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Impact</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RFI_IMPACT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Privacy */}
          <FormField
            control={form.control}
            name="is_private"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-normal">
                  Mark as private
                </FormLabel>
              </FormItem>
            )}
          />
        </form>
      </Form>
    );
  }

  // ── View mode ──────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      {/* Left: title + status + question + responses */}
      <div className="space-y-8 lg:col-span-2">
        {/* Title block */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {rfi.subject || `RFI #${rfi.number}`}
          </h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={formatStatusLabel(rfi.status ?? "open")} />
            {rfi.is_private && (
              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Private
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="space-y-2">
          <SectionLabel>Question</SectionLabel>
          {rfi.question ? (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {rfi.question}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground">
              No question provided.
            </p>
          )}
        </div>

        {/* Responses */}
        <div className="border-t border-border/50 pt-8">
          <RfiResponses rfiId={rfi.id} projectId={projectId} />
        </div>
      </div>

      {/* Right: metadata sidebar — inline-editable like prime contracts */}
      <div className="rounded-md bg-muted/50 p-6 shadow-panel">
        {/* Details */}
        <SectionLabel>Details</SectionLabel>
        <div className="mt-3 space-y-1">
          <DetailField label="RFI #" value={String(rfi.number ?? "")} />
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
          <DetailField label="Date Initiated" value={formatDate(rfi.date_initiated)} />
          <DetailField label="Closed Date" value={formatDate(rfi.closed_date)} />
          <DetailField label="Created" value={formatDate(rfi.created_at)} />
        </div>

        {/* People */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>People</SectionLabel>
          <div className="mt-3 space-y-1">
            {/* People are picked from the directory in the Edit form (Procore
                model), not free-typed inline — so these stay read-only here. */}
            <DetailField label="RFI Manager" value={rfi.rfi_manager} />
            <DetailField label="Received From" value={rfi.received_from} />
            <DetailField label="Contractor" value={rfi.responsible_contractor} />
            <DetailField
              label="Assignees"
              value={rfi.assignees?.length ? rfi.assignees.join(", ") : null}
            />
            <DetailField label="Created By" value={rfi.created_by} />
          </div>
        </div>

        {/* Location & Reference */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>Location &amp; Reference</SectionLabel>
          <div className="mt-3 space-y-1">
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
          </div>
        </div>

        {hasImportedDocuments && (
          <div className="mt-6 border-t border-border/40 pt-6">
            <SectionLabel>Imported Documents</SectionLabel>
            <div className="mt-3 space-y-1">
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
          </div>
        )}

        {/* Impact */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>Impact</SectionLabel>
          <div className="mt-3 space-y-1">
            <EditableDetailField
              label="Schedule"
              type="select"
              options={[...RFI_IMPACT_OPTIONS]}
              value={rfi.schedule_impact ?? ""}
              display={impactLabel(rfi.schedule_impact)}
              onSave={(v) => saveField("schedule_impact", v || null)}
            />
            <EditableDetailField
              label="Cost"
              type="select"
              options={[...RFI_IMPACT_OPTIONS]}
              value={rfi.cost_impact ?? ""}
              display={impactLabel(rfi.cost_impact)}
              onSave={(v) => saveField("cost_impact", v || null)}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>Attachments</SectionLabel>
          <div className="mt-3">
            <EntityAttachments
              entityType="rfi"
              entityId={rfi.id}
              projectId={String(projectId)}
              showLabel={false}
            />
          </div>
        </div>

        {/* Related Items */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <RelatedItemsPanel
            entityType="rfi"
            entityId={rfi.id}
            projectId={projectId}
            flat
          />
        </div>
      </div>
    </div>
  );
}
