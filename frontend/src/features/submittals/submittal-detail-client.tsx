"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Copy,
  FileText,
  MoreHorizontal,
  Package,
  Plus,
  Trash2,
} from "lucide-react";

import { PageShell } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUsers, type AuthUser } from "@/hooks/use-auth-users";
import {
  useAddWorkflowStep,
  useDeleteSubmittal,
  useDuplicateSubmittal,
  useRespondToWorkflowStep,
  type SubmittalDetail,
} from "@/hooks/use-submittals";
import { SubmittalFormDialog } from "./submittal-form-dialog";

// ─── Response badge map ───────────────────────────────────────────────────────

const responseVariantMap: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success"
> = {
  Submitted: "default",
  Pending: "outline",
  Approved: "success",
  "Approved as Noted": "success",
  "Revise and Resubmit": "destructive",
  Revise: "destructive",
  Rejected: "destructive",
  Received: "secondary",
  "Reviewed - No Exception": "success",
};

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

// ─── Inline respond form ──────────────────────────────────────────────────────

interface RespondFormProps {
  projectId: number;
  submittalId: string;
  stepId: string;
  onDone: () => void;
}

function RespondForm({ projectId, submittalId, stepId, onDone }: RespondFormProps) {
  const [status, setStatus] = React.useState<string>("");
  const [comments, setComments] = React.useState("");
  const mutation = useRespondToWorkflowStep(projectId, submittalId, stepId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return;
    await mutation.mutateAsync({ response_status: status, comments: comments || null });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md bg-muted p-3">
      <div className="space-y-1">
        <Label className="text-xs">Response</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select response..." />
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
          placeholder="Add a comment..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!status || mutation.isPending}>
          Submit
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
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
    <form onSubmit={handleAdd} className="rounded-md border border-border bg-card p-4 space-y-3">
      <p className="text-sm font-medium">Add Workflow Step</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">User</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select user..." />
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
        <div className="flex items-end gap-2 pb-0.5">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
            <Checkbox
              checked={required}
              onCheckedChange={(v) => setRequired(Boolean(v))}
            />
            Required
          </label>
        </div>
      </div>
      <Button type="submit" size="sm" disabled={!userId || mutation.isPending}>
        <Plus className="h-3.5 w-3.5" />
        Add Step
      </Button>
    </form>
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
  const deleteMutation = useDeleteSubmittal(projectId);
  const duplicateMutation = useDuplicateSubmittal(projectId);
  const [editOpen, setEditOpen] = React.useState(false);
  // Map of stepId → whether the inline respond form is open
  const [respondingStep, setRespondingStep] = React.useState<string | null>(null);

  const { users } = useAuthUsers(String(projectId));

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const attachments = submittal.submittal_attachments ?? [];
  const history = submittal.submittal_history ?? [];
  const linkedDrawings = submittal.submittal_linked_drawings ?? [];

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
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

  return (
    <>
      <PageShell
        variant="detail"
        title={`${submittal.submittal_number} — ${submittal.title}`}
        description={[
          submittal.status,
          submittal.is_private ? "Private" : null,
          submittal.specification_section ?? null,
        ]
          .filter(Boolean)
          .join(" · ")}
        onBack={() => router.push(`/${projectId}/submittals`)}
        actions={actions}
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
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left: metadata */}
              <div className="md:col-span-2 space-y-6">
                {submittal.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{submittal.description}</p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Attachments ({attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {attachments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No attachments</p>
                    ) : (
                      <ul className="space-y-2">
                        {attachments.map((att) => (
                          <li key={att.id} className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline flex-1 truncate"
                            >
                              {att.file_name}
                            </a>
                            {att.is_current && (
                              <Badge variant="secondary" className="text-xs">
                                CURRENT
                              </Badge>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right: sidebar info */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">Type</p>
                      <p>
                        {typeof submittal.submittal_type === "object"
                          ? (submittal.submittal_type as { name?: string } | null)?.name ?? "—"
                          : submittal.submittal_type ?? "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">Package</p>
                      <p className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {(submittal.submittal_package as { name?: string } | null)?.name ?? "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Ball In Court
                      </p>
                      <p>
                        {submittal.ball_in_court
                          ? resolveUserName(users, submittal.ball_in_court)
                          : "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Final Due Date
                      </p>
                      <p>{formatDate(submittal.final_due_date)}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Lead Time
                      </p>
                      <p>
                        {submittal.lead_time != null ? `${submittal.lead_time} days` : "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Required On-Site
                      </p>
                      <p>{formatDate(submittal.required_on_site_date)}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Responsible Contractor
                      </p>
                      <p>
                        {submittal.responsible_contractor?.name ?? "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Received From
                      </p>
                      <p>
                        {submittal.received_from_id
                          ? resolveUserName(users, submittal.received_from_id)
                          : "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Submittal Manager
                      </p>
                      <p>
                        {submittal.submittal_manager_id
                          ? resolveUserName(users, submittal.submittal_manager_id)
                          : "—"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Sent Date
                      </p>
                      <p>{formatDate(submittal.sent_date)}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-medium">
                        Private
                      </p>
                      <p>{submittal.is_private ? "Yes" : "No"}</p>
                    </div>
                  </CardContent>
                </Card>

                {distributions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribution History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {distributions.map((dist, idx) => (
                        <div key={dist.id} className="text-sm space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(dist.distributed_at)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            From: {resolveUserName(users, dist.from_id)}
                          </p>
                          {dist.message && (
                            <p className="text-muted-foreground">{dist.message}</p>
                          )}
                          <p className="text-xs">
                            {dist.submittal_distribution_recipients?.length ?? 0} recipient
                            {dist.submittal_distribution_recipients?.length !== 1 ? "s" : ""}
                          </p>
                          {idx < distributions.length - 1 && (
                            <Separator className="mt-2" />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Workflow ── */}
          <TabsContent value="workflow" className="space-y-4">
            {workflowSteps.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <p className="text-sm text-muted-foreground">No workflow steps configured.</p>
                    <p className="text-xs text-muted-foreground">
                      Add a step below to begin routing this submittal.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              workflowSteps
                .slice()
                .sort((a, b) => a.step_order - b.step_order)
                .map((step) => (
                  <Card key={step.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-sm font-medium">
                          Step {step.step_order}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {step.step_type}
                        </Badge>
                        {(step as { required?: boolean }).required === false && (
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {step.submittal_responses?.length === 0 && (
                        <p className="text-xs text-muted-foreground">No responses yet</p>
                      )}
                      {step.submittal_responses?.map((resp) => (
                        <div key={resp.id} className="space-y-0">
                          <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
                            <div className="text-sm min-w-0">
                              <p className="font-medium text-xs text-muted-foreground mb-0.5">
                                Responder
                              </p>
                              <p className="truncate">
                                {resolveUserName(users, resp.responder_id)}
                              </p>
                              {resp.comments && (
                                <p className="mt-1 text-muted-foreground text-xs">
                                  {resp.comments}
                                </p>
                              )}
                              {resp.responded_at && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatDate(resp.responded_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <Badge
                                variant={responseVariantMap[resp.response_status] ?? "outline"}
                              >
                                {resp.response_status}
                              </Badge>
                              {resp.response_status === "Pending" && (
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
                              onDone={() => setRespondingStep(null)}
                            />
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
            )}

            <WorkflowBuilder
              projectId={projectId}
              submittalId={submittal.id}
              users={users}
            />
          </TabsContent>

          {/* ── Related Items ── */}
          <TabsContent value="related" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Linked Drawings ({linkedDrawings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {linkedDrawings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drawings linked.</p>
                ) : (
                  <ul className="space-y-2">
                    {linkedDrawings.map((ld, idx) => (
                      <li key={ld.id} className="text-sm flex items-baseline gap-2">
                        <span className="font-medium">Drawing {idx + 1}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {ld.drawing_id}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Change History ── */}
          <TabsContent value="history">
            {history.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No history recorded yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4">
                  <ol className="space-y-4">
                    {history.map((entry) => (
                      <li key={entry.id} className="flex gap-4 text-sm">
                        <span className="text-muted-foreground text-xs w-28 shrink-0">
                          {formatDate(entry.occurred_at)}
                        </span>
                        <div>
                          <span className="font-medium">{entry.action ?? "Update"}</span>
                          {entry.actor_id && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              by {resolveUserName(users, entry.actor_id)}
                            </span>
                          )}
                          {entry.new_status && (
                            <span className="ml-2 text-muted-foreground">
                              → {entry.new_status}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </PageShell>

      <SubmittalFormDialog
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
        submittal={submittal}
      />
    </>
  );
}
