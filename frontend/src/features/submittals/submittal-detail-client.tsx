"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { PageShell } from "@/components/layout";
import { AttachmentUploadPanel, StatusBadge, EmptyState } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuthUsers, type AuthUser } from "@/hooks/use-auth-users";
import { createClient } from "@/lib/supabase/client";
import {
  useAddWorkflowStep,
  useDeleteSubmittal,
  useDuplicateSubmittal,
  useRespondToWorkflowStep,
  useUploadSubmittalAttachment,
  type SubmittalDetail,
} from "@/hooks/use-submittals";

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

function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function resolveUserName(users: AuthUser[], id: string): string {
  const u = users.find((u) => u.id === id);
  if (!u) return id;
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email;
}

// ─── Field pair ───────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[13rem_minmax(0,1fr)] items-start gap-x-3">
      <p className="pt-0.5 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="min-w-0 text-sm leading-6 text-foreground break-words">
        {value ?? "—"}
      </div>
    </div>
  );
}

// ─── Section eyebrow ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ─── Inline respond form ──────────────────────────────────────────────────────

interface RespondFormProps {
  projectId: number;
  submittalId: string;
  stepId: string;
  onDone: (didSubmit?: boolean) => void;
}

function RespondForm({ projectId, submittalId, stepId, onDone }: RespondFormProps) {
  const [status, setStatus] = React.useState<string>("");
  const [comments, setComments] = React.useState("");
  const mutation = useRespondToWorkflowStep(projectId, submittalId, stepId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    await mutation.mutateAsync({ response_status: status, comments: comments || null });
    onDone(true);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3 rounded-md bg-muted/70 p-4">
      <div className="space-y-1">
        <Label className="text-xs">Response</Label>
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
          placeholder="Add a comment…"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!status || mutation.isPending}>
          Submit
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onDone(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Workflow builder ─────────────────────────────────────────────────────────

interface WorkflowBuilderProps {
  projectId: number;
  submittalId: string;
  users: AuthUser[];
}

function WorkflowBuilder({ projectId, submittalId, users }: WorkflowBuilderProps) {
  const [userId, setUserId] = React.useState("");
  const [stepType, setStepType] = React.useState<string>("Approver");
  const [required, setRequired] = React.useState(true);
  const mutation = useAddWorkflowStep(projectId, submittalId);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await mutation.mutateAsync({ user_id: userId, step_type: stepType, required });
    setUserId("");
    setStepType("Approver");
    setRequired(true);
  }

  return (
    <div className="rounded-lg bg-muted/50 p-5">
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
            <Label htmlFor="workflow-required" className="text-xs cursor-pointer">
              Required
            </Label>
          </div>
        </div>
        <Button type="submit" size="sm" disabled={!userId || mutation.isPending}>
          Add Step
        </Button>
      </form>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SubmittalDetailClientProps {
  submittal: SubmittalDetail;
  projectId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubmittalDetailClient({ submittal, projectId }: SubmittalDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const deleteMutation = useDeleteSubmittal(projectId);
  const duplicateMutation = useDuplicateSubmittal(projectId);
  const uploadAttachmentMutation = useUploadSubmittalAttachment(projectId, submittal.id);
  const [respondingStep, setRespondingStep] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [attachments, setAttachments] = React.useState(submittal.submittal_attachments ?? []);

  const { users } = useAuthUsers(String(projectId));

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const history = submittal.submittal_history ?? [];
  const linkedDrawings = submittal.submittal_linked_drawings ?? [];

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

  /** Uploads one attachment and prepends it to the local attachment list on success. */
  async function handleUploadAttachment(file: File) {
    const uploadedAttachment = await uploadAttachmentMutation.mutateAsync(file);
    setAttachments((current) => [uploadedAttachment, ...current]);
  }

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/${projectId}/submittals/${submittal.id}/edit`)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate} disabled={duplicateMutation.isPending}>
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
  );

  const specSection = submittal.specification_section
    ? `Spec §${submittal.specification_section}`
    : null;

  return (
    <PageShell
        variant="detail"
        className="pt-6 sm:pt-10"
        title={`${submittal.submittal_number} — ${submittal.title}`}
        titleContent={
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-[1.75rem] font-medium text-foreground/90 line-clamp-2 wrap-break-word">
              {submittal.submittal_number} — {submittal.title}
            </h1>
            <div className="flex w-full items-center justify-between gap-2">
              <StatusBadge status={submittal.status} />
              {actions}
            </div>
          </div>
        }
        description={[specSection, submittal.is_private ? "Private" : null]
          .filter(Boolean)
          .join(" · ") || undefined}
        onBack={() => router.push(`/${projectId}/submittals`)}
      >
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="workflow">
              Workflow ({workflowSteps.length})
            </TabsTrigger>
            <TabsTrigger value="related">Related Items</TabsTrigger>
            <TabsTrigger value="history">
              Change History ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* ── General ── */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid gap-8 lg:gap-10 md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
              {/* Left: content */}
              <div className="space-y-4">
                {submittal.description && (
                  <div className="rounded-lg bg-muted/50 p-5">
                    <SectionLabel>Description</SectionLabel>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {submittal.description}
                    </p>
                  </div>
                )}

                <AttachmentUploadPanel
                  title="Attachments"
                  description=""
                  headerVariant="muted"
                  files={attachments.map((attachment) => ({
                    id: attachment.id,
                    name: attachment.file_name,
                    sizeBytes: attachment.file_size,
                    uploadedAtLabel: attachment.created_at
                      ? formatDate(attachment.created_at)
                      : null,
                    downloadUrl: attachment.file_url,
                  }))}
                  onUploadFile={handleUploadAttachment}
                  emptyTitle="No attachments"
                  emptyDescription="Attach files to this submittal to share with your team."
                />
              </div>

              {/* Right: metadata sidebar */}
              <div className="space-y-4">
                <div className="space-y-4">
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
                    label="Ball in Court"
                    value={
                      submittal.ball_in_court
                        ? resolveUserName(users, submittal.ball_in_court)
                        : null
                    }
                  />
                  <FieldRow
                    label="Final Due Date"
                    value={formatDate(submittal.final_due_date)}
                  />
                  <FieldRow
                    label="Lead Time"
                    value={
                      submittal.lead_time != null
                        ? `${submittal.lead_time} days`
                        : null
                    }
                  />
                  <FieldRow
                    label="Required On-Site"
                    value={formatDate(submittal.required_on_site_date)}
                  />
                  <FieldRow
                    label="Responsible Contractor"
                    value={submittal.responsible_contractor?.name}
                  />
                  <FieldRow
                    label="Received From"
                    value={
                      submittal.received_from_id
                        ? resolveUserName(users, submittal.received_from_id)
                        : null
                    }
                  />
                  <FieldRow
                    label="Submittal Manager"
                    value={
                      submittal.submittal_manager_id
                        ? resolveUserName(users, submittal.submittal_manager_id)
                        : null
                    }
                  />
                  <FieldRow
                    label="Sent Date"
                    value={formatDate(submittal.sent_date)}
                  />
                  <FieldRow
                    label="Visibility"
                    value={submittal.is_private ? "Private" : "Public"}
                  />
                </div>

                {distributions.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-5">
                    <SectionLabel>Distribution History</SectionLabel>
                    <div className="space-y-4">
                      {distributions.map((dist, idx) => (
                        <div key={dist.id} className="text-sm">
                          <p className="font-medium text-foreground">
                            {formatDate(dist.distributed_at)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From {resolveUserName(users, dist.from_id)}
                          </p>
                          {dist.message && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {dist.message}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {dist.submittal_distribution_recipients?.length ?? 0}{" "}
                            recipient
                            {dist.submittal_distribution_recipients?.length !== 1 ? "s" : ""}
                          </p>
                          {idx < distributions.length - 1 && (
                            <div className="mt-4 border-t border-border" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Workflow ── */}
          <TabsContent value="workflow" className="space-y-3">
            {workflowSteps.length === 0 ? (
              <EmptyState
                title="No workflow steps configured"
                description="Add a step below to begin routing this submittal."
              />
            ) : (
              workflowSteps
                .slice()
                .sort((a, b) => a.step_order - b.step_order)
                .map((step) => (
                  <div key={step.id} className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Step {step.step_order}
                      </span>
                      <StatusBadge status={step.step_type} variant="neutral" />
                      {(step as { required?: boolean }).required === false && (
                        <StatusBadge status="Optional" variant="neutral" />
                      )}
                    </div>

                    {step.submittal_responses?.length === 0 && (
                      <p className="text-xs text-muted-foreground py-1">No responses yet</p>
                    )}

                    <div className="space-y-2">
                      {step.submittal_responses?.map((resp) => (
                        <div key={resp.id}>
                          <div className="flex items-start justify-between gap-4 rounded-md bg-background px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {resolveUserName(users, resp.responder_id)}
                              </p>
                              {resp.comments && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {resp.comments}
                                </p>
                              )}
                              {resp.responded_at && (
                                <p className="text-xs text-muted-foreground/60 mt-0.5">
                                  {formatDate(resp.responded_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <StatusBadge status={resp.response_status} />
                              {resp.response_status === "Pending" && resp.responder_id === currentUserId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() =>
                                    setRespondingStep(
                                      respondingStep === `${step.id}-${resp.id}`
                                        ? null
                                        : `${step.id}-${resp.id}`,
                                    )
                                  }
                                >
                                  Respond
                                </Button>
                              )}
                            </div>
                          </div>
                          {respondingStep === `${step.id}-${resp.id}` && (
                            <RespondForm
                              projectId={projectId}
                              submittalId={submittal.id}
                              stepId={step.id}
                              onDone={(didSubmit) => {
                                setRespondingStep(null);
                                if (didSubmit) {
                                  router.refresh();
                                }
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}

            <WorkflowBuilder
              projectId={projectId}
              submittalId={submittal.id}
              users={users}
            />
          </TabsContent>

          {/* ── Related Items ── */}
          <TabsContent value="related">
            {linkedDrawings.length === 0 ? (
              <EmptyState
                title="No drawings linked"
                description="Link drawings to this submittal to connect related documents."
              />
            ) : (
              <div className="rounded-lg bg-muted/50 p-5">
                <SectionLabel>Linked Drawings ({linkedDrawings.length})</SectionLabel>
                <ul className="space-y-2">
                  {linkedDrawings.map((ld, idx) => (
                    <li key={ld.id} className="flex items-baseline gap-3 text-sm">
                      <span className="font-medium text-foreground">Drawing {idx + 1}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {ld.drawing_id}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ── Change History ── */}
          <TabsContent value="history">
            {history.length === 0 ? (
              <EmptyState
                title="No history recorded yet"
                description="Changes to this submittal will appear here."
              />
            ) : (
              <div className="rounded-lg bg-muted/50 p-5">
                <ol className="divide-y divide-border">
                  {history.map((entry) => (
                    <li key={entry.id} className="flex gap-4 py-3 text-sm">
                      <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">
                        {formatDate(entry.occurred_at)}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">
                          {entry.action ?? "Update"}
                        </span>
                        {entry.actor_id && (
                          <span className="text-xs text-muted-foreground">
                            by {resolveUserName(users, entry.actor_id)}
                          </span>
                        )}
                        {entry.new_status && (
                          <StatusBadge status={entry.new_status} />
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageShell>
  );
}
