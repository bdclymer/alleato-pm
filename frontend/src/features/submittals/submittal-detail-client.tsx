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
  DetailLayout,
  DetailPanel,
  PageShell,
  PageTabs,
  SectionAction,
  SectionRuleHeading,
  SummaryValueRow,
} from "@/components/layout";
import {
  DetailField,
  DetailFieldGrid,
  EditableDetailField,
  EmptyState,
  EntityAttachments,
  InlineEditField,
  StatusBadge,
} from "@/components/ds";
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
import { useQuery } from "@tanstack/react-query";
import { useAuthUsers, type AuthUser } from "@/hooks/use-auth-users";
import { useProjectCompanies } from "@/hooks/use-project-companies";
import { createClient } from "@/lib/supabase/client";
import {
  useAddWorkflowStep,
  useCreateWorkflowTemplate,
  useDeleteSubmittal,
  useDuplicateSubmittal,
  useRespondToWorkflowStep,
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
import { SubmittalAIReviewPanel } from "./submittal-ai-review-panel";
import { SubmittalLinkedDrawingsPanel } from "./submittal-linked-drawings-panel";
import { DrawingPickerDialog } from "./drawing-picker-dialog";

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
  // Match by auth_user_id OR people.id (submittal fields store people.id)
  const u = users.find((u) => u.id === id || u.person_id === id);
  if (!u) return "";
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
  if (!name) return null;
  const initials = getInitials(name);
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
  projectName: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalDetailClient({
  submittal,
  projectId,
  projectName,
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
  const { companies } = useProjectCompanies(String(projectId), { per_page: 200 });
  const { data: submittalTypes = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["submittal-types", projectId],
    queryFn: ({ signal }) => apiFetch(`/api/projects/${projectId}/submittal-types`, { signal }),
  });
  const { data: submittalPackages = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["submittal-packages", projectId],
    queryFn: () => apiFetch(`/api/projects/${projectId}/submittals/packages`),
  });

  async function handleSaveField(field: string, value: string | number | boolean | null) {
    await apiFetch(`/api/projects/${projectId}/submittals/${submittal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    router.refresh();
  }

  const [activeTab, setActiveTab] = React.useState("details");
  const [showAddStep, setShowAddStep] = React.useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const history = submittal.submittal_history ?? [];
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

  const eyebrow = projectName ?? undefined;

  const numberPrefix = submittal.submittal_number
    ? `${String(submittal.submittal_number).padStart(2, "0")}: `
    : "";
  const pageTitle = `${numberPrefix}${submittal.title}`;

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
        title={pageTitle}
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
          <ContentSectionStack className="pt-6">
            <DetailLayout
              sidebar={
                <>
                  {/* Ball in Court */}
                  {submittal.ball_in_court && (
                    <BallInCourtChip userId={submittal.ball_in_court} users={allUsers} />
                  )}

                  {/* Workflow progress */}
                  {workflowSteps.length > 0 && (() => {
                    const completed = workflowSteps.filter(s => getStepState(s) === "done").length;
                    return (
                      <DetailPanel>
                        <SectionRuleHeading label="Workflow Progress" />
                        <div className="space-y-2 pt-1">
                          {workflowSteps.map((step, i) => {
                            const state = getStepState(step);
                            return (
                              <SummaryValueRow
                                key={step.id}
                                label={`${i + 1}. ${step.step_type} Review`}
                                value={state === "done" ? "Done" : state === "in-progress" ? "Active" : state === "rejected" ? "Rejected" : "Waiting"}
                              />
                            );
                          })}
                          <SummaryValueRow
                            label="Total"
                            value={`${completed} of ${workflowSteps.length} complete`}
                            bold
                            border
                          />
                        </div>
                      </DetailPanel>
                    );
                  })()}

                  {/* Dates */}
                  <DetailPanel>
                    <SectionRuleHeading label="Dates" />
                    <div className="space-y-1">
                      {submittal.sent_date && (
                        <DetailField label="Submitted">{formatDate(submittal.sent_date)}</DetailField>
                      )}
                      <EditableDetailField
                        label="Final Due"
                        type="date"
                        value={submittal.final_due_date ?? ""}
                        display={submittal.final_due_date ? formatDate(submittal.final_due_date) : undefined}
                        emptyPlaceholder="Set date"
                        onSave={(v) => handleSaveField("final_due_date", v || null)}
                      />
                      <EditableDetailField
                        label="On-Site"
                        type="date"
                        value={submittal.required_on_site_date ?? ""}
                        display={submittal.required_on_site_date ? formatDate(submittal.required_on_site_date) : undefined}
                        emptyPlaceholder="Set date"
                        onSave={(v) => handleSaveField("required_on_site_date", v || null)}
                      />
                      <EditableDetailField
                        label="Lead Time"
                        type="number"
                        value={submittal.lead_time != null ? String(submittal.lead_time) : ""}
                        display={submittal.lead_time != null ? `${submittal.lead_time} days` : undefined}
                        emptyPlaceholder="Set days"
                        onSave={(v) => handleSaveField("lead_time", v ? parseInt(v, 10) : null)}
                      />
                    </div>
                  </DetailPanel>

                  {/* Parties */}
                  <DetailPanel>
                    <SectionRuleHeading label="Parties" />
                    <div className="space-y-1">
                      {submittal.responsible_contractor && (
                        <DetailField label="Contractor">{submittal.responsible_contractor.name}</DetailField>
                      )}
                      {(submittal.received_from || submittal.received_from_id) && (
                        <DetailField label="Submitted By">
                          {submittal.received_from ?? resolveUserName(allUsers, submittal.received_from_id ?? "")}
                        </DetailField>
                      )}
                      <EditableDetailField
                        label="Ball In Court"
                        type="select"
                        value={submittal.ball_in_court ?? ""}
                        display={submittal.ball_in_court ? resolveUserName(allUsers, submittal.ball_in_court) ?? "" : ""}
                        emptyPlaceholder="Assign person"
                        options={[
                          { value: "", label: "None" },
                          ...users.map((u) => ({
                            value: u.id,
                            label: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email,
                          })),
                        ]}
                        onSave={(v) => handleSaveField("ball_in_court", v || null)}
                      />
                      <EditableDetailField
                        label="Manager"
                        type="select"
                        value={submittal.submittal_manager_id ?? ""}
                        display={submittal.submittal_manager_id ? resolveUserName(allUsers, submittal.submittal_manager_id) ?? "" : ""}
                        emptyPlaceholder="Assign manager"
                        options={[
                          { value: "", label: "None" },
                          ...users.map((u) => ({
                            value: u.id,
                            label: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email,
                          })),
                        ]}
                        onSave={(v) => handleSaveField("submittal_manager_id", v || null)}
                      />
                    </div>
                  </DetailPanel>
                </>
              }
            >

                  {/* General Information */}
                  <DetailPanel>
                    <SectionRuleHeading label="General Information" />
                    <DetailFieldGrid columns={2}>
                      <EditableDetailField
                        label="Title"
                        value={submittal.title ?? ""}
                        span={2}
                        onSave={(v) => handleSaveField("title", v)}
                      />
                      <EditableDetailField
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
                      <EditableDetailField
                        label="Number"
                        value={submittal.submittal_number ?? ""}
                        onSave={(v) => handleSaveField("submittal_number", v)}
                      />
                      <EditableDetailField
                        label="Spec Section"
                        value={submittal.specification_section ?? ""}
                        emptyPlaceholder="e.g. 08-1113"
                        onSave={(v) => handleSaveField("specification_section", v || null)}
                      />
                      <EditableDetailField
                        label="Division"
                        value={submittal.division ?? ""}
                        emptyPlaceholder="e.g. Division 8"
                        onSave={(v) => handleSaveField("division", v || null)}
                      />
                      <EditableDetailField
                        label="Type"
                        type="select"
                        value={
                          typeof submittal.submittal_type === "object"
                            ? (submittal.submittal_type?.id ?? "")
                            : ""
                        }
                        display={getSubmittalTypeName(submittal) ?? undefined}
                        emptyPlaceholder="Select type"
                        options={[
                          { value: "", label: "None" },
                          ...submittalTypes.map((t) => ({ value: t.id, label: t.name })),
                        ]}
                        onSave={(v) => handleSaveField("submittal_type_id", v || null)}
                      />
                      <EditableDetailField
                        label="Package"
                        type="select"
                        value={submittal.submittal_package?.id ?? ""}
                        display={getPackageName(submittal) ?? undefined}
                        emptyPlaceholder="Select package"
                        options={[
                          { value: "", label: "None" },
                          ...submittalPackages.map((p) => ({ value: p.id, label: p.name })),
                        ]}
                        onSave={(v) => handleSaveField("submittal_package_id", v || null)}
                      />
                      <EditableDetailField
                        label="Revision"
                        type="number"
                        value={submittal.revision != null ? String(submittal.revision) : ""}
                        display={submittal.revision != null ? `Rev ${submittal.revision}` : undefined}
                        onSave={(v) => handleSaveField("revision", v ? parseInt(v, 10) : 0)}
                      />
                      <EditableDetailField
                        label="Private"
                        type="boolean"
                        value={String(submittal.is_private)}
                        display={submittal.is_private ? "Yes" : "No"}
                        onSave={(v) => handleSaveField("is_private", v === "true")}
                      />
                      <EditableDetailField
                        label="Description"
                        type="textarea"
                        value={submittal.description ?? ""}
                        emptyPlaceholder="Add a description"
                        span={2}
                        onSave={(v) => handleSaveField("description", v || null)}
                      />
                    </DetailFieldGrid>
                  </DetailPanel>

                  {/* Workflow */}
                  <DetailPanel>
                    <SectionRuleHeading
                      label="Workflow"
                      actions={
                        <SectionAction onClick={() => setShowAddStep(s => !s)}>
                          {showAddStep ? "Cancel" : "+ Add Step"}
                        </SectionAction>
                      }
                    />
                    {workflowSteps.length > 0 ? (
                      <div className="mt-1 overflow-hidden rounded-md border border-border">
                        {workflowSteps.map((step, idx) => {
                          const state = getStepState(step);
                          const responder = step.submittal_responses?.[0]?.responder_id;
                          const responderName = responder ? resolveUserName(allUsers, responder) : null;
                          const isActive = state === "in-progress";
                          const canRespond = isActive && currentUserId && step.submittal_responses?.some(r => r.responder_id === currentUserId && r.response_status === "Pending");
                          const stepResponseEntry = step.submittal_responses?.find(r => r.responder_id === currentUserId && r.response_status === "Pending");
                          return (
                            <div key={step.id} className="border-b border-border last:border-b-0">
                              <div className={cn(
                                "flex items-center gap-4 px-4 py-3",
                                isActive && "bg-muted/40",
                              )}>
                                <div className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                  state === "done" ? "bg-primary text-primary-foreground" :
                                  state === "in-progress" ? "bg-primary/15 text-primary" :
                                  state === "rejected" ? "bg-destructive/15 text-destructive" :
                                  "bg-muted text-muted-foreground",
                                )}>
                                  {state === "done" ? "✓" : idx + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium">{step.step_type} Review</p>
                                  {responderName && (
                                    <p className="text-xs text-muted-foreground">{responderName}</p>
                                  )}
                                </div>
                                <StatusBadge status={
                                  state === "done" ? "Completed" :
                                  state === "in-progress" ? "In Progress" :
                                  state === "rejected" ? "Rejected" : "Pending"
                                } />
                              </div>
                              {canRespond && stepResponseEntry && (
                                <div className="border-t border-border px-4 pb-4 pt-3">
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
                    ) : (
                      !showAddStep && (
                        <EmptyState
                          icon={<MoreHorizontal />}
                          title="No workflow steps"
                          description="Add steps to define the review process."
                        />
                      )
                    )}
                    {showAddStep && (
                      <div className="mt-4" id="workflow-builder">
                        <WorkflowBuilder
                          projectId={projectId}
                          submittalId={submittal.id}
                          users={users}
                          currentSteps={workflowSteps}
                        />
                      </div>
                    )}
                  </DetailPanel>

                  {/* Linked Drawings */}
                  <section>
                    <SectionRuleHeading
                      label="Linked Drawings"
                      actions={
                        <SectionAction onClick={() => setPickerOpen(true)}>
                          + Link Drawing
                        </SectionAction>
                      }
                    />
                    <SubmittalLinkedDrawingsPanel
                      submittalId={submittal.id}
                      projectId={projectId}
                      onAddClick={() => setPickerOpen(true)}
                    />
                    <DrawingPickerDialog
                      open={pickerOpen}
                      onOpenChange={setPickerOpen}
                      projectId={projectId}
                      submittalId={submittal.id}
                    />
                  </section>

                  {/* Attachments */}
                  <section>
                    <SectionRuleHeading label="Attachments" />
                    <EntityAttachments
                      entityType="submittal"
                      entityId={String(submittal.id)}
                      projectId={projectId}
                      showLabel={false}
                    />
                  </section>

                  {/* Activity */}
                  <section>
                    <SectionRuleHeading label="Activity" />
                    <div className="mt-4">
                      {commEvents.length > 0 ? (
                        <ol className="space-y-0">
                          {commEvents.map((event, i) => {
                            const isLast = i === commEvents.length - 1;

                            if (event.kind === "response") {
                              const name = resolveUserName(allUsers, event.responder);
                              const initials = getInitials(name);
                              return (
                                <li key={`resp-${i}`} className="relative flex gap-5">
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
                        <EmptyState title="No activity yet" description="No workflow responses, distributions, or linked RFIs have been recorded." />
                      )}
                    </div>
                  </section>
            </DetailLayout>
          </ContentSectionStack>
            )}

            {activeTab === "ai-review" && (
              <SubmittalAIReviewPanel
                projectId={projectId}
                submittalId={submittal.id}
              />
            )}
          </div>
        )}
      </PageShell>
    </>
  );
}
