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
import { EntityAttachments, StatusBadge, EmptyState } from "@/components/ds";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                {/* State circle */}
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

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ─── Field row ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[12rem_minmax(0,1fr)] items-start gap-x-3">
      <p className="pt-0.5 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 text-sm leading-6 text-foreground break-words">
        {value ?? "—"}
      </div>
    </div>
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
      // Resolve the assigned user from the first response row on this step.
      // submittal_responses[0].responder_id is the auth user id for the assignee.
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
      // All steps lack an assigned user — the template would be unapplyable.
      // Surface a real error rather than saving a dead template.
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
        <div className="rounded-lg bg-muted/40 p-4 space-y-2">
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

      <div className="rounded-lg bg-muted/40 p-5">
        <SectionLabel>Add Workflow Step</SectionLabel>
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
    if (!window.confirm("Move this submittal to the Recycle Bin?")) return;
    await deleteMutation.mutateAsync(submittal.id);
    router.push(`/${projectId}/submittals`);
  }

  async function handleDuplicate() {
    const newRecord = await duplicateMutation.mutateAsync(submittal.id);
    router.push(`/${projectId}/submittals/${newRecord.id}`);
  }

  const actions = (
    <div className="flex items-center gap-1.5">
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
          <Button variant="ghost" size="icon" className="h-8 w-8">
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
  );

  const titleContent = (
    <div className="space-y-2.5">
      <div>
        <p className="text-xs text-muted-foreground">
          {submittal.submittal_number}
          {submittal.revision != null && ` · Rev ${submittal.revision}`}
          {submittal.specification_section && (
            <>
              {" · "}
              <Link
                href={`/${projectId}/specifications`}
                className="hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Spec §{submittal.specification_section}
              </Link>
            </>
          )}
          {submittal.division && (
            <span className="text-muted-foreground/60">
              {" · "}
              {submittal.division}
            </span>
          )}
        </p>
        <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-medium text-foreground/90 line-clamp-2 break-words">
          {submittal.title}
        </h1>
      </div>

      <div className="flex w-full items-center justify-between gap-2">
        <StatusBadge status={submittal.status} />
        {actions}
      </div>

      {submittal.ball_in_court && (
        <BallInCourtChip userId={submittal.ball_in_court} users={allUsers} />
      )}

      <DateTimelineRow submittal={submittal} />
    </div>
  );

  // ── Workflow tab ──────────────────────────────────────────────────────────

  const workflowTab = (
    <div className="space-y-6">
      {workflowSteps.length === 0 ? (
        <EmptyState
          title="No workflow steps configured"
          description="Add reviewers below to begin routing this submittal for approval."
        />
      ) : (
        <>
          <WorkflowStepper
            steps={workflowSteps}
            users={allUsers}
            currentUserId={currentUserId}
            respondingEntry={respondingEntry}
            onRespond={setRespondingEntry}
          />

          {respondingEntry && (
            <RespondForm
              projectId={projectId}
              submittalId={submittal.id}
              stepId={respondingEntry.stepId}
              onDone={(didSubmit) => {
                setRespondingEntry(null);
                if (didSubmit) router.refresh();
              }}
            />
          )}
        </>
      )}

      <WorkflowBuilder
        projectId={projectId}
        submittalId={submittal.id}
        users={users}
        currentSteps={workflowSteps}
      />
    </div>
  );

  // ── Documents tab ─────────────────────────────────────────────────────────

  const documentsTab = (
    <div className="space-y-6">
      <EntityAttachments
        entityType="submittal"
        entityId={String(submittal.id)}
        projectId={projectId}
      />

      {linkedDrawings.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Linked Drawings ({linkedDrawings.length})</SectionLabel>
          <p className="text-sm text-muted-foreground">
            {linkedDrawings.length} drawing
            {linkedDrawings.length !== 1 ? "s" : ""} linked to this submittal.{" "}
            <Link
              href={`/${projectId}/drawings`}
              className="text-foreground underline underline-offset-2 hover:text-primary transition-colors"
            >
              View in Drawings
            </Link>
          </p>
        </div>
      )}
    </div>
  );

  // ── Details tab ───────────────────────────────────────────────────────────

  const detailsTab = (
    <div className="space-y-8">
      {submittal.description && (
        <div>
          <SectionLabel>Description</SectionLabel>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {submittal.description}
          </p>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <SectionLabel>Information</SectionLabel>
          <div className="space-y-3.5">
            <FieldRow
              label="Type"
              value={
                typeof submittal.submittal_type === "object"
                  ? (submittal.submittal_type as { name?: string } | null)?.name
                  : submittal.submittal_type
              }
            />
            <FieldRow
              label="Package"
              value={
                (submittal.submittal_package as { name?: string } | null)?.name
              }
            />
            <FieldRow
              label="Responsible Contractor"
              value={submittal.responsible_contractor?.name}
            />
            <FieldRow
              label="Received From"
              value={
                submittal.received_from_id
                  ? resolveUserName(allUsers, submittal.received_from_id)
                  : null
              }
            />
            <FieldRow
              label="Submittal Manager"
              value={
                submittal.submittal_manager_id
                  ? resolveUserName(allUsers, submittal.submittal_manager_id)
                  : null
              }
            />
            <FieldRow
              label="Visibility"
              value={submittal.is_private ? "Private" : "Public"}
            />
          </div>
        </div>

        <div>
          <SectionLabel>Related Items</SectionLabel>
          <RelatedItemsPanel
            entityType="submittal"
            entityId={submittal.id}
            projectId={projectId}
          />
        </div>
      </div>
    </div>
  );

  // ── Communications tab ────────────────────────────────────────────────────

  // Build a unified chronological feed from all communication events
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

  const communicationsTab = (
    <div className="space-y-1">
      {commEvents.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title="No communications yet"
          description="Linked RFIs, workflow responses, and distributions will appear here as a unified thread."
        />
      ) : (
        <ol className="relative space-y-0 pl-6">
          {/* vertical spine */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" aria-hidden />

          {commEvents.map((event, i) => {
            if (event.kind === "rfi") {
              const rfi = event.rfi;
              const statusColors: Record<string, string> = {
                open: "text-primary",
                draft: "text-muted-foreground",
                closed: "text-foreground",
                answered: "text-primary",
              };
              const color = statusColors[rfi.status?.toLowerCase() ?? ""] ?? "text-muted-foreground";
              return (
                <li key={`rfi-${rfi.link_id}`} className="relative flex gap-4 pb-6">
                  <div className="absolute -left-4 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg bg-muted/30 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          RFI #{rfi.number}
                        </span>
                        <span className={cn("text-xs font-medium capitalize", color)}>
                          {rfi.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                        </span>
                        <Link
                          href={`/${projectId}/rfis/${rfi.id}`}
                          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-foreground leading-snug">
                      {rfi.subject}
                    </p>
                    {rfi.question && (
                      <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {rfi.question}
                      </p>
                    )}
                    {rfi.note && (
                      <p className="mt-2 text-xs text-muted-foreground/70 italic">
                        Note: {rfi.note}
                      </p>
                    )}
                    {rfi.ball_in_court && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Ball in court: <span className="text-foreground font-medium">{resolveUserName(allUsers, rfi.ball_in_court)}</span>
                      </p>
                    )}
                  </div>
                </li>
              );
            }

            if (event.kind === "response") {
              const name = resolveUserName(allUsers, event.responder);
              const initials = getInitials(name.length > 36 ? name.slice(0, 2) : name);
              return (
                <li key={`resp-${i}`} className="relative flex gap-4 pb-6">
                  <div className="absolute -left-4 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
                    <span className="text-[9px] font-bold text-primary">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{name}</span>
                        <span className="text-xs text-muted-foreground">{event.stepType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.status} />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                        </span>
                      </div>
                    </div>
                    {event.comment && (
                      <p className="mt-2.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {event.comment}
                      </p>
                    )}
                  </div>
                </li>
              );
            }

            if (event.kind === "distribution") {
              const name = resolveUserName(allUsers, event.fromId);
              return (
                <li key={`dist-${i}`} className="relative flex gap-4 pb-6">
                  <div className="absolute -left-4 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Send className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm">
                      <span className="font-medium text-foreground">{name}</span>
                      <span className="text-muted-foreground">distributed to</span>
                      <span className="font-medium text-foreground">
                        {event.recipientCount} recipient{event.recipientCount !== 1 ? "s" : ""}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDate(event.date)}
                      </span>
                    </div>
                    {event.message && (
                      <p className="mt-1.5 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground italic">
                        {event.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            }

            return null;
          })}
        </ol>
      )}
    </div>
  );

  // ── History tab ───────────────────────────────────────────────────────────

  const historyTab = (
    <div className="space-y-8">
      {distributions.length > 0 && (
        <div>
          <SectionLabel>Distribution History ({distributions.length})</SectionLabel>
          <div className="space-y-4">
            {distributions.map((dist) => (
              <div key={dist.id} className="rounded-lg bg-muted/40 p-4 text-sm">
                <p className="font-medium text-foreground">
                  {formatDate(dist.distributed_at)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From {resolveUserName(allUsers, dist.from_id)} ·{" "}
                  {dist.submittal_distribution_recipients?.length ?? 0} recipient
                  {dist.submittal_distribution_recipients?.length !== 1 ? "s" : ""}
                </p>
                {dist.message && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {dist.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Change Log ({history.length})</SectionLabel>
        {history.length === 0 ? (
          <EmptyState
            title="No history recorded"
            description="Changes to this submittal will appear here."
          />
        ) : (
          <ol className="space-y-0">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex gap-4 py-2.5 text-sm"
              >
                <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">
                  {formatDate(entry.occurred_at)}
                </span>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-medium text-foreground">
                    {entry.action ?? "Update"}
                  </span>
                  {entry.actor_id && (
                    <span className="text-xs text-muted-foreground">
                      by {resolveUserName(allUsers, entry.actor_id)}
                    </span>
                  )}
                  {entry.new_status && (
                    <StatusBadge status={entry.new_status} />
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <SubmittalDistributeDialog
        projectId={projectId}
        submittalId={submittal.id}
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
      />
      <PageShell
        variant="detail"
        className="pt-6 sm:pt-10"
        title={`${submittal.submittal_number} — ${submittal.title}`}
        titleContent={titleContent}
        onBack={() => router.push(`/${projectId}/submittals`)}
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
          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="workflow">
                Workflow
                {workflowSteps.length > 0 && (
                  <span className="ml-1.5 tabular-nums">({workflowSteps.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="communications">
                Communications
                {commEvents.length > 0 && (
                  <span className="ml-1.5 tabular-nums">({commEvents.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="history">
                History
                {history.length > 0 && (
                  <span className="ml-1.5 tabular-nums">({history.length})</span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-0 pt-2">
              {documentsTab}
            </TabsContent>

            <TabsContent value="workflow" className="mt-0 pt-2">
              {workflowTab}
            </TabsContent>

            <TabsContent value="communications" className="mt-0 pt-4">
              {communicationsTab}
            </TabsContent>

            <TabsContent value="details" className="mt-0 pt-2">
              {detailsTab}
            </TabsContent>

            <TabsContent value="history" className="mt-0 pt-2">
              {historyTab}
            </TabsContent>
          </Tabs>
        )}
      </PageShell>
    </>
  );
}
