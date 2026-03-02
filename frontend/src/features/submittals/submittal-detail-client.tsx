"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  FileText,
  MoreHorizontal,
  Package,
  Trash2,
} from "lucide-react";

import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteSubmittal, type SubmittalDetail } from "@/hooks/use-submittals";
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
  Revise: "destructive",
  Rejected: "destructive",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
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
  const [editOpen, setEditOpen] = React.useState(false);

  async function handleDelete() {
    if (!window.confirm("Move this submittal to the Recycle Bin?")) return;
    await deleteMutation.mutateAsync(submittal.id);
    router.push(`/${projectId}/submittals`);
  }

  const workflowSteps = submittal.submittal_workflow_steps ?? [];
  const distributions = submittal.submittal_distributions ?? [];
  const attachments = submittal.submittal_attachments ?? [];
  const history = submittal.submittal_history ?? [];
  const linkedDrawings = submittal.submittal_linked_drawings ?? [];

  return (
    <>
      <ProjectPageHeader
        title={`${submittal.submittal_number} — ${submittal.title}`}
        description={[
          submittal.status,
          submittal.is_private ? "Private" : null,
          submittal.specification_section ?? null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${projectId}/submittals`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
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
      />

      <PageContainer>
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
                {/* Description */}
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

                {/* Attachments */}
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
                      <p>{submittal.ball_in_court ?? "—"}</p>
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
                  </CardContent>
                </Card>

                {/* Distributions */}
                {distributions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribution History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {distributions.map((dist) => (
                        <div key={dist.id} className="text-sm space-y-1">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(dist.distributed_at)}
                          </p>
                          {dist.message && (
                            <p className="text-muted-foreground">{dist.message}</p>
                          )}
                          <p className="text-xs">
                            {dist.submittal_distribution_recipients?.length ?? 0} recipient
                            {dist.submittal_distribution_recipients?.length !== 1 ? "s" : ""}
                          </p>
                          {distributions.indexOf(dist) < distributions.length - 1 && (
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
                  <p className="text-sm text-muted-foreground">No workflow steps configured.</p>
                </CardContent>
              </Card>
            ) : (
              workflowSteps
                .slice()
                .sort((a, b) => a.step_order - b.step_order)
                .map((step) => (
                  <Card key={step.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Step {step.step_order} — {step.step_type}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {step.submittal_responses?.length === 0 && (
                        <p className="text-xs text-muted-foreground">No responses yet</p>
                      )}
                      {step.submittal_responses?.map((resp) => (
                        <div
                          key={resp.id}
                          className="flex items-start justify-between gap-4 rounded-md border p-4"
                        >
                          <div className="text-sm">
                            <p className="font-medium text-xs text-muted-foreground">
                              Responder
                            </p>
                            <p>{resp.responder_id}</p>
                            {resp.comments && (
                              <p className="mt-1 text-muted-foreground">{resp.comments}</p>
                            )}
                            {resp.responded_at && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(resp.responded_at)}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={responseVariantMap[resp.response_status] ?? "outline"}
                            className="shrink-0"
                          >
                            {resp.response_status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
            )}
          </TabsContent>

          {/* ── Related Items ── */}
          <TabsContent value="related" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked Drawings ({linkedDrawings.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {linkedDrawings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No drawings linked.</p>
                ) : (
                  <ul className="space-y-1">
                    {linkedDrawings.map((ld) => (
                      <li key={ld.id} className="text-sm">
                        Drawing: {ld.drawing_id}
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
      </PageContainer>

      <SubmittalFormDialog
        projectId={projectId}
        open={editOpen}
        onOpenChange={setEditOpen}
        submittal={submittal}
      />
    </>
  );
}
