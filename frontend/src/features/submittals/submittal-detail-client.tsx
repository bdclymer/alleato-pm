"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Send,
  SquarePen,
  Trash2,
  XCircle,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import { EntityAttachments, StatusBadge } from "@/components/ds";
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
  useWorkflowTemplates,
  type SubmittalDetail,
  type WorkflowTemplateStep,
} from "@/hooks/use-submittals";
import { formatDate } from "@/lib/format";
import { appToast as toast } from "@/lib/toast/app-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { SubmittalFormPage } from "./submittal-form-page";
import { SubmittalDistributeDialog } from "./submittal-distribute-dialog";

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

// ─── Date Cell ────────────────────────────────────────────────────────────────

function DateCell({
  label,
  date,
  daysUntil,
}: {
  label: string;
  date: string;
  daysUntil?: number | null;
}) {
  const isOverdue =
    daysUntil !== undefined && daysUntil !== null && daysUntil < 0;
  const isSoon =
    daysUntil !== undefined &&
    daysUntil !== null &&
    daysUntil >= 0 &&
    daysUntil <= 5;

  return (
    <div className="flex min-w-20 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium",
          isOverdue ? "text-destructive" : "text-foreground",
        )}
      >
        {formatDate(date)}
      </span>
      {isOverdue && daysUntil !== null && (
        <span className="flex items-center gap-0.5 text-[10px] font-medium text-destructive">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? "s" : ""} overdue
        </span>
      )}
      {isSoon && !isOverdue && daysUntil !== null && (
        <span className="text-[10px] text-muted-foreground">
          {daysUntil} day{daysUntil !== 1 ? "s" : ""} left
        </span>
      )}
    </div>
  );
}

// ─── Date Timeline Row ────────────────────────────────────────────────────────

function DateTimelineRow({ submittal }: { submittal: SubmittalDetail }) {
  const dueIn = getDaysUntil(submittal.final_due_date);

  const hasDates =
    submittal.sent_date ||
    submittal.final_due_date ||
    submittal.required_on_site_date;

  if (!hasDates && submittal.lead_time == null) return null;

  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2 pt-1">
      {submittal.sent_date && (
        <DateCell label="Submitted" date={submittal.sent_date} />
      )}
      {submittal.sent_date && submittal.final_due_date && (
        <ChevronRight className="mt-3 h-3 w-3 shrink-0 text-muted-foreground/30" />
      )}
      {submittal.final_due_date && (
        <DateCell
          label="Final Due"
          date={submittal.final_due_date}
          daysUntil={dueIn}
        />
      )}
      {submittal.final_due_date && submittal.required_on_site_date && (
        <ChevronRight className="mt-3 h-3 w-3 shrink-0 text-muted-foreground/30" />
      )}
      {submittal.required_on_site_date && (
        <DateCell
          label="On-Site"
          date={submittal.required_on_site_date}
          daysUntil={getDaysUntil(submittal.required_on_site_date)}
        />
      )}
      {submittal.lead_time != null && (
        <span className="ml-1 flex flex-col gap-0.5 rounded-md bg-muted px-2.5 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Lead Time
          </span>
          <span className="text-sm font-medium text-foreground">
            {submittal.lead_time}d
          </span>
        </span>
      )}
    </div>
  );
}

// ─── Workflow Stepper ─────────────────────────────────────────────────────────

type WorkflowStep = SubmittalDetail["submittal_workflow_steps"][number];

function WorkflowStepper({
  steps,
  users,
  currentUserId,
  respondingEntry,
  onRespond,
}: {
  steps: WorkflowStep[];
  users: AuthUser[];
  currentUserId: string | null;
  respondingEntry: { stepId: string; respId: string } | null;
  onRespond: (entry: { stepId: string; respId: string } | null) => void;
}) {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);

  if (sorted.length === 0) return null;

  return (
    <div className="overflow-x-auto py-1">
      <div className="flex items-start gap-0 min-w-max">
        {sorted.map((step, i) => {
          const state = getStepState(step);
          const responses = step.submittal_responses ?? [];
          const pendingForMe = responses.find(
            (r) =>
              r.response_status === "Pending" &&
              r.responder_id === currentUserId,
          );
          const isResponding =
            respondingEntry?.stepId === step.id;

          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <div
                  className="mt-4 h-px w-10 shrink-0 self-start bg-border"
                  aria-hidden
                />
              )}
              <div className="flex w-36 flex-col items-center gap-1.5 px-1 text-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full ring-1",
                    state === "done" &&
                      "bg-primary/10 text-primary ring-primary/25",
                    state === "in-progress" &&
                      "bg-primary/10 text-primary ring-primary/25",
                    state === "rejected" &&
                      "bg-destructive/10 text-destructive ring-destructive/20",
                    state === "not-started" &&
                      "bg-muted text-muted-foreground ring-border",
                  )}
                >
                  {state === "done" && <CheckCircle2 className="h-4 w-4" />}
                  {state === "in-progress" && <Clock className="h-4 w-4" />}
                  {state === "rejected" && <XCircle className="h-4 w-4" />}
                  {state === "not-started" && (
                    <Circle className="h-4 w-4 opacity-40" />
                  )}
                </div>

                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {step.step_order}
                  </span>
                  <span className="text-xs font-medium text-foreground">
                    {step.step_type}
                  </span>

                  {responses.length > 0 ? (
                    <div className="mt-1 flex flex-col items-center gap-1.5 w-full">
                      {responses.map((resp) => (
                        <div
                          key={resp.id}
                          className="flex flex-col items-center gap-0.5"
                        >
                          <span className="text-xs text-muted-foreground leading-tight max-w-full truncate">
                            {resolveUserName(users, resp.responder_id)}
                          </span>
                          <StatusBadge status={resp.response_status} />
                          {resp.responded_at && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {formatDate(resp.responded_at)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="mt-1 text-[10px] text-muted-foreground/50">
                      Unassigned
                    </span>
                  )}

                  {pendingForMe && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() =>
                        isResponding
                          ? onRespond(null)
                          : onRespond({
                              stepId: step.id,
                              respId: pendingForMe.id,
                            })
                      }
                    >
                      {isResponding ? "Cancel" : "Respond"}
                    </Button>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

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
  if (value === null || value === undefined || value === "") return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

// ─── SidebarRow ───────────────────────────────────────────────────────────────

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
      <span className={cn("text-right text-xs", bold ? "font-semibold text-foreground" : "text-foreground", alert && "text-destructive")}>
        {value}
      </span>
    </div>
  );
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
  const [respondingEntry, setRespondingEntry] = React.useState<{
    stepId: string;
    respId: string;
  } | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [distributeOpen, setDistributeOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  const { users, allUsers } = useAuthUsers(String(projectId));

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const history = submittal.submittal_history ?? [];
  const linkedDrawings = submittal.submittal_linked_drawings ?? [];
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
        onBack={() => router.push(`/${projectId}/submittals`)}
        actions={
          <div className="flex items-center gap-2">
            {submittal.status !== "Closed" && !submittal.deleted_at && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setDistributeOpen(true)}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Email
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
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[1fr_280px]">
            {/* ── LEFT MAIN COLUMN ── */}
            <div className="min-w-0 space-y-10">

              {/* Status */}
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={submittal.status} />
                {submittal.ball_in_court && (
                  <BallInCourtChip userId={submittal.ball_in_court} users={allUsers} />
                )}
              </div>

              {/* Metadata grid row 1 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                <MetaField label="Spec Section" value={submittal.specification_section} />
                <MetaField label="Number" value={submittal.submittal_number} />
                <MetaField
                  label="Revision"
                  value={submittal.revision != null ? `Rev ${submittal.revision}` : null}
                />
                <MetaField
                  label="Package"
                  value={(submittal.submittal_package as { name?: string } | null)?.name ?? (typeof submittal.submittal_package === "string" ? submittal.submittal_package : null)}
                />
              </div>

              {/* Metadata grid row 2 */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                <MetaField
                  label="Type"
                  value={typeof submittal.submittal_type === "object" ? (submittal.submittal_type as { name?: string } | null)?.name : submittal.submittal_type}
                />
                <MetaField label="Division" value={submittal.division} />
                <MetaField
                  label="Linked Drawings"
                  value={linkedDrawings.length > 0 ? (
                    <Link href={`/${projectId}/drawings`} className="text-primary hover:underline underline-offset-2">
                      {linkedDrawings.length} drawing{linkedDrawings.length !== 1 ? "s" : ""}
                    </Link>
                  ) : null}
                />
                <MetaField label="Visibility" value={submittal.is_private ? "Private" : "Public"} />
              </div>

              {/* Description */}
              {submittal.description && (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Description</p>
                  <div className="rounded-md bg-muted/40 px-4 py-3">
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {submittal.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div>
                <EntityAttachments
                  entityType="submittal"
                  entityId={String(submittal.id)}
                  projectId={projectId}
                />
              </div>

              {/* Workflow */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Workflow</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-sm text-primary"
                    onClick={() => {
                      const el = document.getElementById("workflow-builder");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Add Step
                  </Button>
                </div>

                {workflowSteps.length > 0 && (
                  <div className="mb-6">
                    {/* Table header */}
                    <div className="grid grid-cols-[2rem_1fr_6rem_10rem_6rem] gap-x-4 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
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
                              "grid grid-cols-[2rem_1fr_6rem_10rem_6rem] gap-x-4 border-b border-border py-3 text-sm",
                              isActive && "relative before:absolute before:-left-3 before:top-0 before:bottom-0 before:w-0.5 before:bg-primary"
                            )}
                          >
                            <span className="text-muted-foreground">{idx + 1}</span>
                            <span className="font-medium text-foreground">{step.step_type}</span>
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
                                  setRespondingEntry(null);
                                  if (didSubmit) router.refresh();
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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
              </div>

              {/* Activity feed */}
              {commEvents.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Activity</span>
                    {submittal.submittal_number && (
                      <span className="text-xs text-muted-foreground">
                        Submittal #{submittal.submittal_number}
                      </span>
                    )}
                  </div>
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
                </div>
              )}

              {/* Related Items */}
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Related Items</p>
                <RelatedItemsPanel
                  entityType="submittal"
                  entityId={submittal.id}
                  projectId={projectId}
                />
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="space-y-8 lg:pt-0">

              {/* Dates & Timeline */}
              {(submittal.sent_date || submittal.final_due_date || submittal.required_on_site_date || submittal.lead_time != null) && (
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Dates &amp; Timeline
                  </p>
                  <div className="divide-y divide-border">
                    {submittal.sent_date && (
                      <SidebarRow label="Submitted" value={formatDate(submittal.sent_date)} />
                    )}
                    {submittal.final_due_date && (
                      <SidebarRow
                        label="Final Due Date"
                        value={formatDate(submittal.final_due_date)}
                        alert={getDaysUntil(submittal.final_due_date) !== null && (getDaysUntil(submittal.final_due_date) ?? 0) < 0}
                      />
                    )}
                    {submittal.required_on_site_date && (
                      <SidebarRow label="Required On-Site" value={formatDate(submittal.required_on_site_date)} />
                    )}
                    {submittal.lead_time != null && (
                      <SidebarRow label="Lead Time" value={`${submittal.lead_time} days`} />
                    )}
                  </div>
                </div>
              )}

              {/* Parties & Responsibility */}
              {(submittal.responsible_contractor || submittal.received_from || submittal.received_from_id || submittal.submittal_manager_id || submittal.ball_in_court) && (
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
                    {submittal.ball_in_court && (
                      <SidebarRow
                        label="Ball in Court"
                        value={resolveUserName(allUsers, submittal.ball_in_court)}
                        bold
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PageShell>
    </>
  );
}
