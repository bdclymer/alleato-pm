"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Mail,
  MoreHorizontal,
  SquarePen,
  Trash2,
} from "lucide-react";

import {
  ContentSectionStack,
  DetailPanel,
  PageShell,
  PageTabs,
  SectionRuleHeading,
} from "@/components/layout";
import {
  EntityAttachments,
  InlineEditField,
  StatusBadge,
} from "@/components/ds";
import { RelatedItemsPanel } from "@/components/domain/related-items/RelatedItemsPanel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuthUsers, type AuthUser } from "@/hooks/use-auth-users";
import { createClient } from "@/lib/supabase/client";
import {
  useAddWorkflowStep,
  useCreateWorkflowTemplate,
  useDeleteSubmittal,
  useDuplicateSubmittal,
  useRespondToWorkflowStep,
  useSubmittalLinkedDrawings,
  useWorkflowTemplates,
  type SubmittalDetail,
  type WorkflowTemplateStep,
} from "@/hooks/use-submittals";
import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { appToast as toast } from "@/lib/toast/app-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { SubmittalFormPage } from "./submittal-form-page";
import { SubmittalDistributeDialog } from "./submittal-distribute-dialog";
import { SubmittalLinkedDrawingsPanel } from "./submittal-linked-drawings-panel";
import { DrawingPickerDialog } from "./drawing-picker-dialog";
import { SubmittalAIReviewPanel } from "./submittal-ai-review-panel";

// ─── Constants ────────────────────────────────────────────────────────────────

const RESPONSE_STATUSES = [
  "Approved",
  "Approved as Noted",
  "Revise and Resubmit",
  "Rejected",
  "Reviewed - No Exception",
] as const;

const STEP_TYPES = ["Approver", "Submitter", "Reviewer"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUserName(users: AuthUser[], id: string): string {
  const u = users.find((u) => u.id === id);
  if (!u) return id;
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type StepState = "done" | "in-progress" | "rejected" | "not-started";

function getStepState(
  step: SubmittalDetail["submittal_workflow_steps"][number],
): StepState {
  const responses = step.submittal_responses ?? [];
  if (responses.length === 0) return "not-started";
  const hasRejected = responses.some(
    (r) =>
      r.response_status === "Rejected" ||
      r.response_status === "Revise and Resubmit",
  );
  if (hasRejected) return "rejected";
  const hasPending = responses.some((r) => r.response_status === "Pending");
  if (hasPending) return "in-progress";
  return "done";
}

// ─── Ball in Court Chip ───────────────────────────────────────────────────────

function BallInCourtChip({
  userId,
  users,
}: {
  userId: string;
  users: AuthUser[];
}) {
  const name = resolveUserName(users, userId);
  const initials = getInitials(name === userId ? "??" : name);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Currently with
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[9px] font-bold text-primary-foreground shrink-0">
          {initials}
        </span>
        <span className="text-sm font-medium text-primary-foreground">{name}</span>
      </span>
    </div>
  );
}

type WorkflowStep = SubmittalDetail["submittal_workflow_steps"][number];

// ─── Respond form ─────────────────────────────────────────────────────────────

interface RespondFormProps {
  projectId: number;
  submittalId: string;
  stepId: string;
  onDone: (didSubmit?: boolean) => void;
}

function RespondForm({
  projectId,
  submittalId,
  stepId,
  onDone,
}: RespondFormProps) {
  const [status, setStatus] = React.useState<string>("");
  const [comments, setComments] = React.useState("");
  const mutation = useRespondToWorkflowStep(projectId, submittalId, stepId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    await mutation.mutateAsync({
      response_status: status,
      comments: comments || null,
    });
    onDone(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg bg-muted/50 p-5 space-y-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        Your Response
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Decision</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select response…" />
            </SelectTrigger>
            <SelectContent>
              {RESPONSE_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Comments (optional)</Label>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            className="text-xs resize-none"
            placeholder="Add a note…"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="sm"
          disabled={!status || mutation.isPending}
        >
          Submit Response
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDone(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Workflow Builder ─────────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  projectId: number;
  submittalId: string;
  users: AuthUser[];
  currentSteps: {
    step_type: string;
    required?: boolean;
    submittal_responses?: Array<{ responder_id: string; response_status: string }>;
  }[];
}

function WorkflowBuilder({
  projectId,
  submittalId,
  users,
  currentSteps,
}: WorkflowBuilderProps) {
  const router = useRouter();
  const [userId, setUserId] = React.useState("");
  const [stepType, setStepType] = React.useState<string>("Approver");
  const [required, setRequired] = React.useState(true);
  const [templateName, setTemplateName] = React.useState("");
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const mutation = useAddWorkflowStep(projectId, submittalId);
  const { data: templates = [] } = useWorkflowTemplates(projectId);
  const createTemplate = useCreateWorkflowTemplate(projectId);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await mutation.mutateAsync({ user_id: userId, step_type: stepType, required });
    setUserId("");
    setStepType("Approver");
    setRequired(true);
    router.refresh();
  }

  async function handleApplyTemplate(templateId: string) {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const assignableSteps = tpl.steps.filter((s) => s.user_id);
    if (assignableSteps.length === 0) return;
    for (const step of assignableSteps) {
      await mutation.mutateAsync({
        user_id: step.user_id ?? "",
        step_type: step.step_type,
        required: step.required,
      });
    }
    router.refresh();
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateName.trim() || currentSteps.length === 0) return;
    const steps: WorkflowTemplateStep[] = currentSteps.map((s) => {
      const assignedUserId =
        s.submittal_responses?.[0]?.responder_id ?? null;
      return {
        step_type: s.step_type,
        required: s.required ?? true,
        user_id: assignedUserId,
      };
    });

    const stepsWithUsers = steps.filter((s) => s.user_id !== null);
    if (stepsWithUsers.length === 0) {
      toast.error("Cannot save template", {
        description:
          "No workflow steps have an assigned user. Add at least one step with a user before saving a template.",
      });
      return;
    }

    await createTemplate.mutateAsync({ name: templateName.trim(), steps });
    setTemplateName("");
    setSavingTemplate(false);
  }

  return (
    <div className="space-y-4 pt-2">
      {templates.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Apply Template
          </p>
          <Select onValueChange={handleApplyTemplate}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select a template to apply…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                  {t.description ? ` — ${t.description}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Add Workflow Step
        </p>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {resolveUserName(users, u.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Step Type</Label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-1.5 pb-0.5">
              <Checkbox
                id="workflow-required"
                checked={required}
                onCheckedChange={(v) => setRequired(Boolean(v))}
              />
              <Label
                htmlFor="workflow-required"
                className="text-xs cursor-pointer"
              >
                Required
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!userId || mutation.isPending}
            >
              Add Step
            </Button>
            {currentSteps.length > 0 && !savingTemplate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSavingTemplate(true)}
              >
                Save as Template
              </Button>
            )}
          </div>
        </form>

        {savingTemplate && (
          <form
            onSubmit={handleSaveTemplate}
            className="mt-4 flex gap-2 items-end"
          >
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Template Name</Label>
              <Input
                className="h-8 text-xs"
                placeholder="e.g. Standard Approval"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!templateName.trim() || createTemplate.isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSavingTemplate(false);
                setTemplateName("");
              }}
            >
              Cancel
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── MetaField ────────────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 min-h-5 truncate text-sm font-medium text-foreground">
        {value === null || value === undefined || value === "" ? (
          <span className="text-muted-foreground/40">—</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function SidebarRow({
  label,
  value,
  bold,
  alert,
}: {
  label: string;
  value?: string | null;
  bold?: boolean;
  alert?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-sm",
          bold ? "font-semibold text-foreground" : "font-medium text-foreground",
          alert && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <SectionRuleHeading label={title} actions={action} className="mb-0 pb-0" />
  );
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-4 text-sm text-muted-foreground">{children}</p>
  );
}

function getSubmittalTypeName(submittal: SubmittalDetail): string | null {
  if (typeof submittal.submittal_type === "object") {
    return submittal.submittal_type?.name ?? null;
  }
  return submittal.submittal_type ?? null;
}

function getPackageName(submittal: SubmittalDetail): string | null {
  if (typeof submittal.submittal_package === "object") {
    return submittal.submittal_package?.name ?? null;
  }
  return submittal.submittal_package ?? null;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubmittalDetailClientProps {
  submittal: SubmittalDetail;
  projectId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalDetailClient({
  submittal,
  projectId,
}: SubmittalDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const deleteMutation = useDeleteSubmittal(projectId);
  const duplicateMutation = useDuplicateSubmittal(projectId);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [distributeOpen, setDistributeOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const { users, allUsers } = useAuthUsers(String(projectId));

  async function handleSaveField(field: string, value: string | number | boolean | null) {
    await apiFetch(`/api/projects/${projectId}/submittals/${submittal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = React.useState("details");
  const { data: linkedDrawings } = useSubmittalLinkedDrawings(projectId, submittal.id);

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const history = submittal.submittal_history ?? [];
  const staticLinkedDrawings = submittal.submittal_linked_drawings ?? [];
  const linkedRfis = submittal.linked_rfis ?? [];

  React.useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setCurrentUserId(data.user?.id ?? null);
    });
    return () => {
      isMounted = false;
    };
  }, [supabase.auth]);

  async function handleDelete() {
    const ok = await confirm({
      title: "Move to Recycle Bin?",
      description: "This submittal will be moved to the Recycle Bin. You can restore it later.",
      confirmLabel: "Move to Bin",
      variant: "destructive",
    });
    if (!ok) return;
    await deleteMutation.mutateAsync(submittal.id);
    router.push(`/${projectId}/submittals`);
  }

  async function handleDuplicate() {
    const newRecord = await duplicateMutation.mutateAsync(submittal.id);
    router.push(`/${projectId}/submittals/${newRecord.id}`);
  }

  // Build unified comms feed
  type CommEvent =
    | { kind: "rfi"; date: string; rfi: (typeof linkedRfis)[number] }
    | { kind: "response"; date: string; stepType: string; responder: string; status: string; comment: string | null }
    | { kind: "distribution"; date: string; fromId: string; recipientCount: number; message: string | null };

  const commEvents: CommEvent[] = [
    ...linkedRfis.map((rfi) => ({
      kind: "rfi" as const,
      date: rfi.date_initiated ?? rfi.created_at,
      rfi,
    })),
    ...workflowSteps.flatMap((step) =>
      (step.submittal_responses ?? [])
        .filter((r) => r.responded_at || r.response_status !== "Pending")
        .map((r) => ({
          kind: "response" as const,
          date: r.responded_at ?? "",
          stepType: step.step_type,
          responder: r.responder_id,
          status: r.response_status,
          comment: r.comments,
        })),
    ),
    ...distributions.map((d) => ({
      kind: "distribution" as const,
      date: d.distributed_at ?? "",
      fromId: d.from_id,
      recipientCount: d.submittal_distribution_recipients?.length ?? 0,
      message: d.message,
    })),
  ]
    .filter((e) => !!e.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const eyebrow = [
    submittal.submittal_number,
    submittal.revision != null ? `Rev ${submittal.revision}` : null,
    submittal.specification_section ? `Spec §${submittal.specification_section}` : null,
    submittal.division ?? null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {ConfirmDialog}
      <SubmittalDistributeDialog
        projectId={projectId}
        submittalId={submittal.id}
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
      />
      <PageShell
        variant="detailXWide"
        eyebrow={eyebrow}
        title={submittal.title}
        statusBadge={<StatusBadge status={submittal.status} />}
        onBack={() => router.push(`/${projectId}/submittals`)}
        actions={
          <div className="flex items-center gap-2">
            {submittal.status !== "Closed" && !submittal.deleted_at && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Email submittal"
                onClick={() => setDistributeOpen(true)}
              >
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <SquarePen className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDuplicate}
                  disabled={duplicateMutation.isPending}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {isEditing ? (
          <SubmittalFormPage
            projectId={projectId}
            submittal={submittal}
            mode="inline"
            onCancel={() => setIsEditing(false)}
            onSaved={() => {
              setIsEditing(false);
              router.refresh();
            }}
          />
        ) : (
          <div>
            <PageTabs
              variant="inline"
              tabs={[
                { label: "Details", href: "details", isActive: activeTab === "details" },
                { label: "AI Review", href: "ai-review", isActive: activeTab === "ai-review" },
              ]}
              onTabClick={(href) => setActiveTab(href)}
            />

            {activeTab === "details" && (
          <ContentSectionStack className="pt-3">
            <section>
              <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
                <div className="space-y-6">
                  <DetailPanel>
                    <SectionRuleHeading label="General Information" className="mb-6 pb-0" />
                    <div className="space-y-10">
              <section className="space-y-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Spec Section</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Spec Section"
                        value={submittal.specification_section ?? ""}
                        placeholder="e.g. 03 30 00"
                        onSave={(v) => handleSaveField("specification_section", v || null)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Number</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Number"
                        value={submittal.submittal_number ?? ""}
                        onSave={(v) => handleSaveField("submittal_number", v)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Revision</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Revision"
                        type="number"
                        value={submittal.revision != null ? String(submittal.revision) : ""}
                        display={submittal.revision != null ? `Rev ${submittal.revision}` : undefined}
                        onSave={(v) => handleSaveField("revision", v ? parseInt(v, 10) : 0)}
                      />
                    </div>
                  </div>
                  <MetaField label="Package" value={getPackageName(submittal)} />
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Status"
                        type="select"
                        value={submittal.status}
                        display={<StatusBadge status={submittal.status} />}
                        options={[
                          { value: "Draft", label: "Draft" },
                          { value: "Open", label: "Open" },
                          { value: "Distributed", label: "Distributed" },
                          { value: "Closed", label: "Closed" },
                        ]}
                        onSave={(v) => handleSaveField("status", v)}
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Division</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Division"
                        value={submittal.division ?? ""}
                        placeholder="e.g. Division 03"
                        onSave={(v) => handleSaveField("division", v || null)}
                      />
                    </div>
                  </div>
                  <MetaField label="Type" value={getSubmittalTypeName(submittal)} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Private</p>
                    <div className="mt-1">
                      <InlineEditField
                        label="Private"
                        type="boolean"
                        value={String(submittal.is_private)}
                        display={submittal.is_private ? "Yes" : "No"}
                        onSave={(v) => handleSaveField("is_private", v === "true")}
                      />
                    </div>
                  </div>
                </div>
                {staticLinkedDrawings.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
                    <MetaField
                      label="Linked Drawings"
                      value={
                        <Link
                          href={`/${projectId}/drawings`}
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {staticLinkedDrawings.length} drawing{staticLinkedDrawings.length !== 1 ? "s" : ""}
                        </Link>
                      }
                    />
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <SectionHeader title="Description" />
                <InlineEditField
                  label="Description"
                  type="textarea"
                  value={submittal.description ?? ""}
                  placeholder="Add a description…"
                  onSave={(v) => handleSaveField("description", v || null)}
                />
              </section>

              <section className="space-y-3">
                <SectionHeader title="Attachments" />
                <EntityAttachments
                  entityType="submittal"
                  entityId={String(submittal.id)}
                  projectId={projectId}
                />
              </section>

              <section className="space-y-3">
                <SectionHeader title="Linked Drawings" />
                <SubmittalLinkedDrawingsPanel
                  projectId={projectId}
                  submittalId={submittal.id}
                  onAddClick={() => setPickerOpen(true)}
                />
              </section>

              <section className="space-y-4">
                <SectionHeader title="Workflow" />

                {workflowSteps.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <div style={{ minWidth: "715px" }}>
                    <div className="grid grid-cols-[40px_208px_172px_192px_132px] bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      <span>#</span>
                      <span>Step</span>
                      <span>Role</span>
                      <span>Assignee</span>
                      <span>Status</span>
                    </div>
                    {workflowSteps.map((step, idx) => {
                      const state = getStepState(step);
                      const responder = step.submittal_responses?.[0]?.responder_id;
                      const responderName = responder ? resolveUserName(allUsers, responder) : null;
                      const responderInitials = responderName ? getInitials(responderName) : null;
                      const isActive = state === "in-progress";
                      const canRespond = isActive && currentUserId && step.submittal_responses?.some(r => r.responder_id === currentUserId && r.response_status === "Pending");
                      const stepResponseEntry = step.submittal_responses?.find(r => r.responder_id === currentUserId && r.response_status === "Pending");
                      return (
                        <div key={step.id}>
                          <div
                            className={cn(
                              "relative grid grid-cols-[40px_208px_172px_192px_132px] border-t border-border px-3 py-3 text-sm",
                              isActive && "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary"
                            )}
                          >
                            <span className="text-muted-foreground">{idx + 1}</span>
                            <span className="font-medium text-foreground">
                              {step.step_type} Review
                            </span>
                            <span className="text-muted-foreground">{step.step_type}</span>
                            <span className="flex items-center gap-2">
                              {responderInitials && (
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                                  {responderInitials}
                                </span>
                              )}
                              <span className="truncate text-foreground">{responderName ?? "—"}</span>
                            </span>
                            <span>
                              <StatusBadge status={state === "done" ? "Completed" : state === "in-progress" ? "In Progress" : state === "rejected" ? "Rejected" : "Pending"} />
                            </span>
                          </div>
                          {canRespond && stepResponseEntry && (
                            <div className="py-3">
                              <RespondForm
                                projectId={projectId}
                                submittalId={submittal.id}
                                stepId={step.id}
                                onDone={(didSubmit) => {
                                  if (didSubmit) router.refresh();
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}

                <div id="workflow-builder">
                  <WorkflowBuilder
                    projectId={projectId}
                    submittalId={submittal.id}
                    users={users}
                    currentSteps={workflowSteps}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <SectionHeader
                  title="Activity"
                  action={
                    submittal.submittal_number ? (
                    <span className="text-xs text-muted-foreground">
                      Submittal #{submittal.submittal_number}
                    </span>
                    ) : null
                  }
                />
                {commEvents.length > 0 ? (
                  <ol className="space-y-0">
                    {commEvents.map((event, i) => {
                      const isLast = i === commEvents.length - 1;

                      if (event.kind === "response") {
                        const name = resolveUserName(allUsers, event.responder);
                        const initials = getInitials(name);
                        return (
                          <li key={`resp-${i}`} className="relative flex gap-5">
                            {/* Rail */}
                            <div className="relative flex w-6 shrink-0 flex-col items-center">
                              <span className="relative z-10 mt-1 flex h-2.5 w-2.5 rounded-full bg-border ring-2 ring-background" />
                              {!isLast && <span className="absolute top-3.5 bottom-0 w-px bg-border" />}
                            </div>
                            {/* Content */}
                            <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                                    {initials}
                                  </span>
                                  <div>
                                    <p className="text-sm font-medium text-foreground leading-tight">{name}</p>
                                    <p className="text-xs text-muted-foreground">{event.stepType}</p>
                                  </div>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(event.date)}</span>
                              </div>
                              {event.comment ? (
                                <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                                  <p className="mb-1 text-xs font-semibold text-muted-foreground">{event.status}</p>
                                  <p className="text-sm text-foreground leading-relaxed">{event.comment}</p>
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  responded <span className="font-medium text-foreground">{event.status}</span>
                                </p>
                              )}
                            </div>
                          </li>
                        );
                      }

                      if (event.kind === "distribution") {
                        const name = resolveUserName(allUsers, event.fromId);
                        const initials = getInitials(name);
                        return (
                          <li key={`dist-${i}`} className="relative flex gap-5">
                            <div className="relative flex w-6 shrink-0 flex-col items-center">
                              <span className="relative z-10 mt-1 flex h-2.5 w-2.5 rounded-full bg-border ring-2 ring-background" />
                              {!isLast && <span className="absolute top-3.5 bottom-0 w-px bg-border" />}
                            </div>
                            <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                                    {initials}
                                  </span>
                                  <p className="text-sm font-medium text-foreground">{name}</p>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(event.date)}</span>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                distributed to{" "}
                                <span className="font-medium text-foreground">
                                  {event.recipientCount} recipient{event.recipientCount !== 1 ? "s" : ""}
                                </span>
                              </p>
                              {event.message && (
                                <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                                  <p className="text-sm text-muted-foreground italic">{event.message}</p>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      }

                      if (event.kind === "rfi") {
                        const rfi = event.rfi;
                        return (
                          <li key={`rfi-${rfi.link_id}`} className="relative flex gap-5">
                            <div className="relative flex w-6 shrink-0 flex-col items-center">
                              <span className="relative z-10 mt-1 flex h-2.5 w-2.5 rounded-full bg-border ring-2 ring-background" />
                              {!isLast && <span className="absolute top-3.5 bottom-0 w-px bg-border" />}
                            </div>
                            <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-6")}>
                              <div className="flex items-start justify-between gap-4">
                                <p className="text-sm font-medium text-foreground">{rfi.subject}</p>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                                  <Link href={`/${projectId}/rfis/${rfi.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                                    <ExternalLink className="h-3 w-3" />
                                  </Link>
                                </div>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">RFI #{rfi.number} · {rfi.status}</p>
                            </div>
                          </li>
                        );
                      }

                      return null;
                    })}
                  </ol>
                ) : (
                  <EmptySection>No workflow responses, distributions, or linked RFIs have been recorded.</EmptySection>
                )}
              </section>

              <section className="space-y-3">
                <SectionHeader title="Related Items" />
                <RelatedItemsPanel
                  entityType="submittal"
                  entityId={submittal.id}
                  projectId={projectId}
                />
              </section>
                    </div>
                  </DetailPanel>
                </div>

                <aside>
                  <DetailPanel>
                    <SectionRuleHeading label="Submittal Summary" className="mb-6 pb-0" />
                    <div className="space-y-8">
              {submittal.ball_in_court && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ball In Court
                  </p>
                  <BallInCourtChip userId={submittal.ball_in_court} users={allUsers} />
                </div>
              )}

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dates &amp; Timeline
                </p>
                <div className="divide-y divide-border">
                  {submittal.sent_date && (
                    <SidebarRow label="Submitted" value={formatDate(submittal.sent_date)} />
                  )}
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Final Due Date</span>
                    <div className={cn("text-right text-sm font-medium", getDaysUntil(submittal.final_due_date) !== null && (getDaysUntil(submittal.final_due_date) ?? 0) < 0 ? "text-destructive" : "text-foreground")}>
                      <InlineEditField
                        label="Final Due Date"
                        type="date"
                        value={submittal.final_due_date ?? ""}
                        display={submittal.final_due_date ? formatDate(submittal.final_due_date) : undefined}
                        emptyLabel="Set date"
                        onSave={(v) => handleSaveField("final_due_date", v || null)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Required On-Site</span>
                    <div className="text-right text-sm font-medium text-foreground">
                      <InlineEditField
                        label="Required On-Site"
                        type="date"
                        value={submittal.required_on_site_date ?? ""}
                        display={submittal.required_on_site_date ? formatDate(submittal.required_on_site_date) : undefined}
                        emptyLabel="Set date"
                        onSave={(v) => handleSaveField("required_on_site_date", v || null)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <span className="text-xs text-muted-foreground">Lead Time</span>
                    <div className="text-right text-sm font-medium text-foreground">
                      <InlineEditField
                        label="Lead Time"
                        type="number"
                        value={submittal.lead_time != null ? String(submittal.lead_time) : ""}
                        display={submittal.lead_time != null ? `${submittal.lead_time} days` : undefined}
                        emptyLabel="Set days"
                        onSave={(v) => handleSaveField("lead_time", v ? parseInt(v, 10) : null)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {(submittal.responsible_contractor || submittal.received_from || submittal.received_from_id || submittal.submittal_manager_id) && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Parties &amp; Responsibility
                  </p>
                  <div className="divide-y divide-border">
                    {submittal.responsible_contractor && (
                      <SidebarRow label="Responsible Contractor" value={submittal.responsible_contractor.name} bold />
                    )}
                    {(submittal.received_from ?? submittal.received_from_id) && (
                      <SidebarRow
                        label="Received From"
                        value={submittal.received_from ?? resolveUserName(allUsers, submittal.received_from_id!)}
                        bold
                      />
                    )}
                    {submittal.submittal_manager_id && (
                      <SidebarRow
                        label="Submittal Manager"
                        value={resolveUserName(allUsers, submittal.submittal_manager_id)}
                        bold
                      />
                    )}
                  </div>
                </div>
              )}
                    </div>
                  </DetailPanel>
                </aside>
              </div>
            </section>
          </ContentSectionStack>
            )}

            {activeTab === "ai-review" && (
              <SubmittalAIReviewPanel
                projectId={projectId}
                submittalId={submittal.id}
                linkedDrawingCount={linkedDrawings?.length ?? 0}
              />
            )}
          </div>
        )}
      </PageShell>
      <DrawingPickerDialog
        projectId={projectId}
        submittalId={submittal.id}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
      />
    </>
  );
}
