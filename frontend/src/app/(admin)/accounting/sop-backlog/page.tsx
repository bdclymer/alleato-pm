"use client";

import * as React from "react";
import { CheckCircle2, FileText, Link2, Plus } from "lucide-react";
import { PageShell } from "@/components/layout";
import { InfoAlert, StatusBadge } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type SopStatus = "needed" | "draft" | "in_review" | "published" | "archived";
type BusinessArea = "accounting" | "finance";
type PriorityLabel = "critical" | "high" | "medium" | "low";

type SopBacklogRecord = {
  id: string;
  title: string;
  business_area: BusinessArea;
  document_type: "sop";
  status: SopStatus;
  priority: number;
  priority_label: PriorityLabel | null;
  description: string | null;
  owner: string | null;
  linked_document_metadata_id: string | null;
  linked_document_title: string | null;
  linked_document_status: string;
  project_name: string | null;
  age_days: number;
  last_updated_days: number;
  created_at: string;
  updated_at: string;
};

type SopBacklogResponse = {
  records: SopBacklogRecord[];
  generatedAt: string;
};

type FormState = {
  title: string;
  business_area: BusinessArea;
  priority: string;
  priority_label: PriorityLabel;
  owner: string;
  description: string;
};

const INITIAL_FORM: FormState = {
  title: "",
  business_area: "accounting",
  priority: "10",
  priority_label: "high",
  owner: "",
  description: "",
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ");
}

function formatAge(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

function priorityTone(priority: number): string {
  if (priority <= 10) return "text-destructive";
  if (priority <= 30) return "text-amber-600";
  return "text-muted-foreground";
}

export default function SopBacklogPage() {
  const [records, setRecords] = React.useState<SopBacklogRecord[]>([]);
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadRecords = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    apiFetch<SopBacklogResponse>("/api/accounting/sop-backlog")
      .then((response) => setRecords(response.records))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load SOP backlog.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const neededRecords = records.filter((record) => record.status === "needed");
  const linkedRecords = records.filter((record) => record.linked_document_metadata_id);
  const overdueRecords = neededRecords.filter((record) => record.age_days >= 30);

  async function createRecord(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await apiFetch<{ record: SopBacklogRecord }>(
        "/api/accounting/sop-backlog",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            business_area: form.business_area,
            document_type: "sop",
            status: "needed",
            priority: Number.parseInt(form.priority, 10),
            priority_label: form.priority_label,
            owner: form.owner || null,
            description: form.description || null,
          }),
        },
      );
      setRecords((current) => [response.record, ...current]);
      setForm(INITIAL_FORM);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create SOP backlog record.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(record: SopBacklogRecord, status: SopStatus) {
    setError(null);
    const previous = records;
    setRecords((current) =>
      current.map((item) => (item.id === record.id ? { ...item, status } : item)),
    );
    try {
      const response = await apiFetch<{ record: SopBacklogRecord }>(
        `/api/accounting/sop-backlog/${record.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      setRecords((current) =>
        current.map((item) => (item.id === record.id ? response.record : item)),
      );
    } catch (statusError) {
      setRecords(previous);
      setError(statusError instanceof Error ? statusError.message : "Failed to update SOP status.");
    }
  }

  return (
    <PageShell
      variant="dashboard"
      title="SOP Backlog"
      description="Structured accounting and finance SOP requirements before or after a file exists."
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Needed SOPs</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {neededRecords.length}
            </p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Linked to files</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {linkedRecords.length}
            </p>
          </div>
          <div className="bg-card p-4">
            <p className="text-xs text-muted-foreground">Needed over 30 days</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {overdueRecords.length}
            </p>
          </div>
        </section>

        {error && (
          <InfoAlert variant="error" role="alert">
            {error}
          </InfoAlert>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Create placeholder SOP</h2>
            <p className="text-sm text-muted-foreground">
              Add the missing requirement now; link the uploaded SOP file later.
            </p>
          </div>

          <form onSubmit={createRecord} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="space-y-2 lg:col-span-4">
              <Label htmlFor="sop-title">Title</Label>
              <Input
                id="sop-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Monthly close checklist SOP"
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Area</Label>
              <Select
                value={form.business_area}
                onValueChange={(value: BusinessArea) =>
                  setForm((current) => ({ ...current, business_area: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accounting">Accounting</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sop-priority">Priority</Label>
              <Input
                id="sop-priority"
                type="number"
                min={0}
                value={form.priority}
                onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label>Priority label</Label>
              <Select
                value={form.priority_label}
                onValueChange={(value: PriorityLabel) =>
                  setForm((current) => ({ ...current, priority_label: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="sop-owner">Owner</Label>
              <Input
                id="sop-owner"
                value={form.owner}
                onChange={(event) => setForm((current) => ({ ...current, owner: event.target.value }))}
                placeholder="Owner"
              />
            </div>
            <div className="space-y-2 lg:col-span-10">
              <Label htmlFor="sop-description">Description</Label>
              <Textarea
                id="sop-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What gap does leadership need closed?"
              />
            </div>
            <div className="flex items-end lg:col-span-2">
              <Button type="submit" className="w-full gap-2" disabled={isSaving}>
                <Plus className="h-4 w-4" />
                Add SOP
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Leadership backlog</h2>
            <Button variant="outline" size="sm" onClick={loadRecords} disabled={isLoading}>
              Refresh
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">SOP</th>
                    <th className="px-4 py-3 text-left font-medium">Area</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Priority</th>
                    <th className="px-4 py-3 text-left font-medium">Owner</th>
                    <th className="px-4 py-3 text-left font-medium">Linked document</th>
                    <th className="px-4 py-3 text-left font-medium">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        Loading SOP backlog...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No SOP backlog records yet.
                      </td>
                    </tr>
                  ) : (
                    records.map((record) => (
                      <tr key={record.id} className="bg-background align-top">
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {record.title}
                            </div>
                            {record.description && (
                              <p className="max-w-md text-xs text-muted-foreground">
                                {record.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize text-foreground">{record.business_area}</td>
                        <td className="px-4 py-3">
                          <Select
                            value={record.status}
                            onValueChange={(value: SopStatus) => updateStatus(record, value)}
                          >
                            <SelectTrigger size="sm" className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="needed">Needed</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="in_review">In review</SelectItem>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className={cn("font-medium tabular-nums", priorityTone(record.priority))}>
                              {record.priority}
                            </span>
                            {record.priority_label && (
                              <div className="text-xs capitalize text-muted-foreground">
                                {record.priority_label}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{record.owner ?? "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {record.linked_document_metadata_id ? (
                              <CheckCircle2 className="h-4 w-4 text-status-success" />
                            ) : (
                              <Link2 className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <StatusBadge status={record.linked_document_status} />
                              {record.linked_document_title && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {record.linked_document_title}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <div>{formatAge(record.age_days)}</div>
                          <div className="text-xs">Updated {formatAge(record.last_updated_days)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
