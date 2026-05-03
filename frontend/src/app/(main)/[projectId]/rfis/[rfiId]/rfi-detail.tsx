"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { RelatedItemsPanel } from "@/components/domain/related-items/RelatedItemsPanel";

import {
  Checkbox,
  EditModeActions,
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
import { RfiResponses } from "@/components/rfis/rfi-responses";
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

// ---------------------------------------------------------------------------
// Horizontal field row for the sidebar
// ---------------------------------------------------------------------------

function SidebarField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-xs text-foreground">
        {value || "—"}
      </span>
    </div>
  );
}

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
              <FormField
                control={form.control}
                name="rfi_manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RFI Manager</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="received_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Received From</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="responsible_contractor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Contractor</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="assignees"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Assignees</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Comma-separated names"
                        value={(field.value ?? []).join(", ")}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(
                            val
                              ? val
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : [],
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

      {/* Right: metadata sidebar */}
      <div className="rounded-md bg-muted/50 p-6 shadow-panel">
        {/* Details */}
        <SectionLabel>Details</SectionLabel>
        <div className="mt-3 divide-y divide-border/40">
          <SidebarField label="RFI #" value={String(rfi.number ?? "")} />
          <SidebarField label="Stage" value={rfi.rfi_stage} />
          <SidebarField label="Due Date" value={formatDate(rfi.due_date)} />
          <SidebarField label="Date Initiated" value={formatDate(rfi.date_initiated)} />
          <SidebarField label="Closed Date" value={formatDate(rfi.closed_date)} />
          <SidebarField label="Created" value={formatDate(rfi.created_at)} />
        </div>

        {/* People */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>People</SectionLabel>
          <div className="mt-3 divide-y divide-border/40">
            <SidebarField label="RFI Manager" value={rfi.rfi_manager} />
            <SidebarField label="Received From" value={rfi.received_from} />
            <SidebarField
              label="Contractor"
              value={rfi.responsible_contractor}
            />
            <SidebarField
              label="Assignees"
              value={rfi.assignees?.length ? rfi.assignees.join(", ") : null}
            />
            <SidebarField label="Created By" value={rfi.created_by} />
          </div>
        </div>

        {/* Location & Reference */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <SectionLabel>Location &amp; Reference</SectionLabel>
          <div className="mt-3 divide-y divide-border/40">
            <SidebarField label="Location" value={rfi.location} />
            <SidebarField label="Drawing #" value={rfi.drawing_number} />
            <SidebarField label="Specification" value={rfi.specification} />
            <SidebarField label="Cost Code" value={rfi.cost_code} />
            <SidebarField label="Reference" value={rfi.reference} />
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
          <div className="mt-3 divide-y divide-border/40">
            <SidebarField label="Schedule" value={rfi.schedule_impact} />
            <SidebarField label="Cost" value={rfi.cost_impact} />
          </div>
        </div>

        {/* Related Items */}
        <div className="mt-6 border-t border-border/40 pt-6">
          <RelatedItemsPanel
            entityType="rfi"
            entityId={rfi.id}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );
}
