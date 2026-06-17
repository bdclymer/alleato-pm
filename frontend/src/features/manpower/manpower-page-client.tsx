"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarRange,
  Download,
  Loader2,
  Search,
  Upload,
  Users,
  UserRoundPlus,
} from "lucide-react";
import { SectionRuleHeading } from "@/components/layout/spacing";
import { EmptyState, ErrorState, InfoAlert } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { SAMPLE_MANPOWER_CSV } from "./sample-data";
import { daysUntilAssignmentStart, isAssignmentActive } from "./parser";
import type {
  ManpowerAssignment,
  ManpowerAssignmentStatus,
  ManpowerPagePayload,
  ManpowerPersonOption,
  ManpowerProjectStage,
} from "./types";

type TimeFilter = "active" | "next_30" | "all";

const STATUS_VARIANTS: Record<ManpowerAssignmentStatus, string> = {
  filled: "bg-success/10 text-success",
  open: "bg-warning/10 text-warning",
  tbd: "bg-muted text-muted-foreground",
};

const STAGE_VARIANTS: Record<ManpowerProjectStage, string> = {
  active: "bg-success/10 text-success",
  upcoming: "bg-info/10 text-info",
  completed: "bg-muted text-muted-foreground",
  undated: "bg-muted text-muted-foreground",
};

function PlainTable({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}

function PlainTableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

function PlainTableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function PlainTableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b transition-colors hover:bg-muted/50", className)} {...props} />;
}

function PlainTableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("h-10 px-4 text-left align-middle font-medium text-muted-foreground", className)}
      {...props}
    />
  );
}

function PlainTableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("p-4 align-middle", className)} {...props} />;
}

function formatImportedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown import time" : format(date, "MMM d, yyyy 'at' h:mm a");
}

function formatWindow(assignment: ManpowerAssignment): string {
  if (assignment.startLabel && assignment.finishLabel) {
    return `${assignment.startLabel} - ${assignment.finishLabel}`;
  }
  if (assignment.startLabel) return `Starts ${assignment.startLabel}`;
  if (assignment.finishLabel) return `Ends ${assignment.finishLabel}`;
  return "No dates";
}

function matchesTimeFilter(assignment: ManpowerAssignment, filter: TimeFilter, now: Date): boolean {
  if (filter === "all") return true;
  if (filter === "active") return isAssignmentActive(assignment, now);
  const daysUntilStart = daysUntilAssignmentStart(assignment, now);
  return daysUntilStart !== null && daysUntilStart >= 0 && daysUntilStart <= 30;
}

const COVERAGE_OPTIONS: Array<{
  value: string;
  label: string;
  status: ManpowerAssignmentStatus;
  personId: string | null;
}> = [
  { value: "open", label: "New Hire", status: "open", personId: null },
  { value: "tbd", label: "TBD", status: "tbd", personId: null },
  { value: "unassigned", label: "Unassigned", status: "open", personId: null },
];

export function ManpowerPageClient() {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [payload, setPayload] = React.useState<ManpowerPagePayload | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isImporting, setIsImporting] = React.useState(false);
  const [rowUpdateId, setRowUpdateId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | ManpowerAssignmentStatus>("all");
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>("active");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [assigneeFilter, setAssigneeFilter] = React.useState("all");
  const now = React.useMemo(() => new Date(), []);

  const loadPayload = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const nextPayload = await apiFetch<ManpowerPagePayload>("/api/manpower");
      setPayload(nextPayload);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load manpower plan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPayload();
  }, [loadPayload]);

  const handleImportSample = React.useCallback(async () => {
    setIsImporting(true);
    setLoadError(null);
    try {
      const nextPayload = await apiFetch<ManpowerPagePayload>("/api/manpower/import", {
        method: "POST",
        body: JSON.stringify({
          csvText: SAMPLE_MANPOWER_CSV,
          sourceLabel: "Alleato manpower sample",
        }),
      });
      setPayload(nextPayload);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to import sample manpower plan.");
    } finally {
      setIsImporting(false);
    }
  }, []);

  const handleFileUpload = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setLoadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const nextPayload = await apiFetch<ManpowerPagePayload>("/api/manpower/import", {
        method: "POST",
        body: formData,
      });
      setPayload(nextPayload);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to import manpower CSV.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const handleCoverageChange = React.useCallback(
    async (assignment: ManpowerAssignment, value: string) => {
      setRowUpdateId(assignment.id);
      setLoadError(null);
      try {
        const person = payload?.people.find((candidate) => candidate.id === value) ?? null;
        const preset = COVERAGE_OPTIONS.find((option) => option.value === value) ?? null;

        const nextPayload = await apiFetch<ManpowerPagePayload>(
          `/api/manpower/assignments/${assignment.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              assigneePersonId: person?.id ?? preset?.personId ?? null,
              assigneeName: person?.name ?? preset?.label ?? null,
              status: person ? "filled" : preset?.status ?? "open",
              notes: assignment.notes,
            }),
          },
        );
        setPayload(nextPayload);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to update manpower assignment.");
      } finally {
        setRowUpdateId(null);
      }
    },
    [payload?.people],
  );

  const plan = payload?.plan ?? null;
  const people = payload?.people ?? [];

  const roles = React.useMemo(
    () => Array.from(new Set((plan?.assignments ?? []).map((assignment) => assignment.role))).sort(),
    [plan?.assignments],
  );

  const assignees = React.useMemo(
    () =>
      Array.from(
        new Set(
          (plan?.assignments ?? [])
            .map((assignment) => assignment.assigneeName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [plan?.assignments],
  );

  const filteredAssignments = React.useMemo(() => {
    const assignments = plan?.assignments ?? [];
    const term = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      if (statusFilter !== "all" && assignment.status !== statusFilter) return false;
      if (roleFilter !== "all" && assignment.role !== roleFilter) return false;
      if (assigneeFilter !== "all" && (assignment.assigneeName ?? "Unassigned") !== assigneeFilter) return false;
      if (!matchesTimeFilter(assignment, timeFilter, now)) return false;
      if (!term) return true;

      return [
        assignment.projectCode,
        assignment.projectName,
        assignment.role,
        assignment.assigneeName,
        assignment.notes,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [assigneeFilter, now, plan?.assignments, roleFilter, search, statusFilter, timeFilter]);

  const openAssignments = React.useMemo(
    () => filteredAssignments.filter((assignment) => assignment.status !== "filled"),
    [filteredAssignments],
  );

  const peopleSummary = React.useMemo(() => {
    const byPerson = new Map<
      string,
      {
        assignee: string;
        totalAssignments: number;
        activeAssignments: number;
        projects: Set<string>;
      }
    >();

    filteredAssignments.forEach((assignment) => {
      if (!assignment.assigneeName || assignment.status !== "filled") return;
      const current = byPerson.get(assignment.assigneeName) ?? {
        assignee: assignment.assigneeName,
        totalAssignments: 0,
        activeAssignments: 0,
        projects: new Set<string>(),
      };
      current.totalAssignments += 1;
      current.projects.add(assignment.projectName);
      if (isAssignmentActive(assignment, now)) {
        current.activeAssignments += 1;
      }
      byPerson.set(assignment.assigneeName, current);
    });

    return Array.from(byPerson.values()).sort((left, right) => {
      if (right.activeAssignments !== left.activeAssignments) {
        return right.activeAssignments - left.activeAssignments;
      }
      return right.totalAssignments - left.totalAssignments;
    });
  }, [filteredAssignments, now]);

  const kpis = React.useMemo(() => {
    if (!plan) return [];
    const activeAssignments = plan.assignments.filter((assignment) => isAssignmentActive(assignment, now));
    const openRoles = plan.assignments.filter((assignment) => assignment.status !== "filled");
    const assignedPeople = new Set(
      plan.assignments
        .filter((assignment) => assignment.status === "filled" && assignment.assigneeName)
        .map((assignment) => assignment.assigneeName),
    );

    return [
      {
        label: "Active projects",
        value: plan.projects.filter((project) => project.stage === "active").length,
        detail: `${plan.projects.length} total in active plan`,
        icon: CalendarRange,
      },
      {
        label: "Active assignments",
        value: activeAssignments.length,
        detail: "Roles staffed right now",
        icon: Users,
      },
      {
        label: "Coverage gaps",
        value: openRoles.length,
        detail: "Open or TBD roles",
        icon: UserRoundPlus,
      },
      {
        label: "Assigned people",
        value: assignedPeople.size,
        detail: "Named people on the active plan",
        icon: ArrowUpRight,
      },
    ];
  }, [now, plan]);

  if (isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Cross-project staffing plan persisted from Microsoft Project CSV imports.
            </p>
            {plan ? (
              <p className="text-sm text-muted-foreground">
                Active plan: {plan.sourceLabel} imported {formatImportedAt(plan.importedAt)}
                {plan.importedByName ? ` by ${plan.importedByName}` : ""}.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active manpower plan is stored yet.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleImportSample}
              disabled={isImporting}
            >
              <Download className="mr-2 size-4" />
              Load sample
            </Button>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
              Upload CSV
            </Button>
          </div>
        </div>

        <InfoAlert variant="info">
          CSV imports now write the active manpower plan to Supabase. Assignee changes on this page update the stored plan instead of resetting on refresh.
        </InfoAlert>

        {loadError ? (
          <ErrorState
            title="Manpower system error"
            error={loadError}
          />
        ) : null}
      </section>

      {!plan ? (
        <EmptyState
          title="No persisted manpower plan"
          description="Upload the latest spreadsheet export or load the sample plan to initialize the staffing system."
          action={
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleImportSample} disabled={isImporting}>
                Load sample
              </Button>
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                Upload CSV
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {kpi.label}
                    </CardTitle>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-3xl font-semibold tracking-tight text-foreground">
                      {kpi.value}
                    </div>
                    <p className="text-sm text-muted-foreground">{kpi.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="space-y-4">
            <SectionRuleHeading
              label="Coverage gaps"
              actions={
                <Badge variant="outline" className="w-fit">
                  {openAssignments.length} gaps in current filter set
                </Badge>
              }
            />
            <p className="text-sm text-muted-foreground">
              Open roles and TBD assignments in the active plan.
            </p>
            <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
              <PlainTable>
                <PlainTableHeader>
                  <PlainTableRow>
                    <PlainTableHead>Project</PlainTableHead>
                    <PlainTableHead>Role</PlainTableHead>
                    <PlainTableHead>Coverage</PlainTableHead>
                    <PlainTableHead>Window</PlainTableHead>
                    <PlainTableHead>Notes</PlainTableHead>
                  </PlainTableRow>
                </PlainTableHeader>
                <PlainTableBody>
                  {openAssignments.slice(0, 12).map((assignment) => (
                    <PlainTableRow key={assignment.id}>
                      <PlainTableCell className="align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">{assignment.projectName}</div>
                          <div className="text-xs text-muted-foreground">{assignment.projectCode ?? "No project code"}</div>
                        </div>
                      </PlainTableCell>
                      <PlainTableCell className="align-top">{assignment.role}</PlainTableCell>
                      <PlainTableCell className="align-top">
                        <Badge className={cn("border-0", STATUS_VARIANTS[assignment.status])}>
                          {assignment.assigneeName ?? "Unassigned"}
                        </Badge>
                      </PlainTableCell>
                      <PlainTableCell className="align-top text-sm text-muted-foreground">{formatWindow(assignment)}</PlainTableCell>
                      <PlainTableCell className="align-top text-sm text-muted-foreground">{assignment.notes ?? "—"}</PlainTableCell>
                    </PlainTableRow>
                  ))}
                  {openAssignments.length === 0 ? (
                    <PlainTableRow>
                      <PlainTableCell colSpan={5}>
                        <EmptyState
                          title="No coverage gaps in this view"
                          description="The current filters only show filled assignments."
                        />
                      </PlainTableCell>
                    </PlainTableRow>
                  ) : null}
                </PlainTableBody>
              </PlainTable>
            </div>
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="People load" />
            <p className="text-sm text-muted-foreground">
              Highest assignment volume first so staffing pressure is visible without scanning the entire plan.
            </p>
            <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
              <PlainTable>
                <PlainTableHeader>
                  <PlainTableRow>
                    <PlainTableHead>Person</PlainTableHead>
                    <PlainTableHead className="text-right">Active now</PlainTableHead>
                    <PlainTableHead className="text-right">Total rows</PlainTableHead>
                    <PlainTableHead>Projects</PlainTableHead>
                  </PlainTableRow>
                </PlainTableHeader>
                <PlainTableBody>
                  {peopleSummary.slice(0, 12).map((person) => (
                    <PlainTableRow key={person.assignee}>
                      <PlainTableCell className="font-medium text-foreground">{person.assignee}</PlainTableCell>
                      <PlainTableCell className="text-right">
                        <span className={cn(person.activeAssignments >= 3 ? "text-warning" : "text-foreground")}>
                          {person.activeAssignments}
                        </span>
                      </PlainTableCell>
                      <PlainTableCell className="text-right text-muted-foreground">{person.totalAssignments}</PlainTableCell>
                      <PlainTableCell className="text-sm text-muted-foreground">
                        {Array.from(person.projects).slice(0, 3).join(", ")}
                        {person.projects.size > 3 ? ` +${person.projects.size - 3} more` : ""}
                      </PlainTableCell>
                    </PlainTableRow>
                  ))}
                  {peopleSummary.length === 0 ? (
                    <PlainTableRow>
                      <PlainTableCell colSpan={4}>
                        <EmptyState
                          title="No assigned people in this view"
                          description="Broaden the filters to see staffed roles."
                        />
                      </PlainTableCell>
                    </PlainTableRow>
                  ) : null}
                </PlainTableBody>
              </PlainTable>
            </div>
          </section>

          <section className="space-y-4">
            <SectionRuleHeading label="Assignments" />
            <p className="text-sm text-muted-foreground">
              Filter the persisted plan and reassign staffing directly from this page.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="relative sm:col-span-2 xl:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search project, role, assignee, or notes"
                  className="pl-9"
                />
              </div>
              <Select value={timeFilter} onValueChange={(value: TimeFilter) => setTimeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Time window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active now</SelectItem>
                  <SelectItem value="next_30">Starting in 30 days</SelectItem>
                  <SelectItem value="all">All dates</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value: "all" | ManpowerAssignmentStatus) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="tbd">TBD</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee} value={assignee}>
                      {assignee}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{filteredAssignments.length} assignments</span>
              <span aria-hidden="true">•</span>
              <span>{new Set(filteredAssignments.map((assignment) => assignment.manpowerProjectId)).size} projects</span>
              <span aria-hidden="true">•</span>
              <span>{plan.warningCount} import warnings on active plan</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
              <PlainTable>
                <PlainTableHeader>
                  <PlainTableRow>
                    <PlainTableHead>Project</PlainTableHead>
                    <PlainTableHead>Role</PlainTableHead>
                    <PlainTableHead>Coverage</PlainTableHead>
                    <PlainTableHead>Status</PlainTableHead>
                    <PlainTableHead>Window</PlainTableHead>
                    <PlainTableHead>Project stage</PlainTableHead>
                    <PlainTableHead>Notes</PlainTableHead>
                  </PlainTableRow>
                </PlainTableHeader>
                <PlainTableBody>
                  {filteredAssignments.map((assignment) => {
                    const currentCoverageValue =
                      assignment.assigneePersonId ??
                      (assignment.status === "tbd"
                        ? "tbd"
                        : assignment.assigneeName === "New Hire"
                          ? "open"
                          : "unassigned");
                    const project = plan.projects.find((candidate) => candidate.id === assignment.manpowerProjectId);

                    return (
                      <PlainTableRow key={assignment.id}>
                        <PlainTableCell className="align-top">
                          <div className="space-y-1">
                            <div className="font-medium text-foreground">{assignment.projectName}</div>
                            <div className="text-xs text-muted-foreground">{assignment.projectCode ?? "No project code"}</div>
                          </div>
                        </PlainTableCell>
                        <PlainTableCell className="align-top">{assignment.role}</PlainTableCell>
                        <PlainTableCell className="align-top">
                          <Select
                            value={currentCoverageValue}
                            onValueChange={(value) => void handleCoverageChange(assignment, value)}
                            disabled={rowUpdateId === assignment.id}
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Choose coverage" />
                            </SelectTrigger>
                            <SelectContent>
                              {COVERAGE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                              {people.map((person: ManpowerPersonOption) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </PlainTableCell>
                        <PlainTableCell className="align-top">
                          <Badge className={cn("border-0", STATUS_VARIANTS[assignment.status])}>
                            {rowUpdateId === assignment.id ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="size-3 animate-spin" />
                                Saving
                              </span>
                            ) : assignment.status === "filled" ? (
                              "Filled"
                            ) : assignment.status === "open" ? (
                              "Open"
                            ) : (
                              "TBD"
                            )}
                          </Badge>
                        </PlainTableCell>
                        <PlainTableCell className="align-top text-sm text-muted-foreground">{formatWindow(assignment)}</PlainTableCell>
                        <PlainTableCell className="align-top">
                          <Badge className={cn("border-0", STAGE_VARIANTS[project?.stage ?? "undated"])}>
                            {project?.stage ?? "undated"}
                          </Badge>
                        </PlainTableCell>
                        <PlainTableCell className="align-top text-sm text-muted-foreground">{assignment.notes ?? "—"}</PlainTableCell>
                      </PlainTableRow>
                    );
                  })}
                  {filteredAssignments.length === 0 ? (
                    <PlainTableRow>
                      <PlainTableCell colSpan={7}>
                        <EmptyState
                          title="No manpower rows match these filters"
                          description="Adjust the search, horizon, or staffing filters to recover the stored plan."
                        />
                      </PlainTableCell>
                    </PlainTableRow>
                  ) : null}
                </PlainTableBody>
              </PlainTable>
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              Imports fail loudly when the CSV format drifts. Missing required columns or unmappable rows return an error instead of silently dropping staffing data.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
