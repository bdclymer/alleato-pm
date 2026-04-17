"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MoreVertical,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InlineTable,
  InlineTableHeader,
  InlineTableHeaderRow,
  InlineTableHeaderCell,
  InlineTableBody,
  InlineTableRow,
  InlineTableCell,
} from "@/components/ds/inline-table";
import { apiFetch } from "@/lib/api-client";
import type { BudgetCode, VerticalMarkup } from "@/app/(main)/[projectId]/prime-contracts/[contractId]/types";

const ALLOWED_MARKUP_TYPES = ["insurance", "bond", "fee", "overhead", "custom"] as const;

const normalizeVerticalMarkupRows = (rows: VerticalMarkup[]): VerticalMarkup[] =>
  rows.map((row) => ({
    ...row,
    markup_type: row.markup_type ?? "",
    percentage: Number.isFinite(Number(row.percentage))
      ? Number(row.percentage)
      : 0,
    compound: Boolean(row.compound),
    calculation_order: Number.isFinite(Number(row.calculation_order))
      ? Number(row.calculation_order)
      : 0,
  }));

const findDuplicateMarkupTypes = (rows: VerticalMarkup[]): string[] => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = (row.markup_type ?? "").trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
};

const getNextAvailableMarkupType = (rows: VerticalMarkup[]): string | null => {
  const used = new Set(
    rows.map((row) => (row.markup_type ?? "").trim().toLowerCase()),
  );
  for (const type of ALLOWED_MARKUP_TYPES) {
    if (!used.has(type)) return type;
  }
  return null;
};

interface PrimeContractFinancialMarkupTabProps {
  projectId: string;
  budgetCodes: BudgetCode[];
  verticalMarkups: VerticalMarkup[];
  setVerticalMarkups: React.Dispatch<React.SetStateAction<VerticalMarkup[]>>;
  savedVerticalMarkups: VerticalMarkup[];
  setSavedVerticalMarkups: React.Dispatch<React.SetStateAction<VerticalMarkup[]>>;
  markupsLoading: boolean;
}

export function PrimeContractFinancialMarkupTab({
  projectId,
  budgetCodes,
  verticalMarkups,
  setVerticalMarkups,
  savedVerticalMarkups,
  setSavedVerticalMarkups,
  markupsLoading,
}: PrimeContractFinancialMarkupTabProps) {
  const [isSavingMarkupTable, setIsSavingMarkupTable] = useState(false);
  const [isSubmittingMarkup, setIsSubmittingMarkup] = useState(false);
  const [deletingMarkupId, setDeletingMarkupId] = useState<string | null>(null);
  const [markupMapsToById, setMarkupMapsToById] = useState<Record<string, string>>({});
  const [savedMarkupMapsToById, setSavedMarkupMapsToById] = useState<Record<string, string>>({});
  const [markupDisplayById, setMarkupDisplayById] = useState<Record<string, "horizontal" | "vertical">>({});
  const [savedMarkupDisplayById, setSavedMarkupDisplayById] = useState<Record<string, "horizontal" | "vertical">>({});
  const [editingMarkupRowIds, setEditingMarkupRowIds] = useState<Record<string, boolean>>({});

  // Persisted preferences are saved only when the table is saved, matching the primary save flow.
  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-maps:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setMarkupMapsToById(parsed);
        setSavedMarkupMapsToById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-display:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, "horizontal" | "vertical">;
      if (parsed && typeof parsed === "object") {
        setMarkupDisplayById(parsed);
        setSavedMarkupDisplayById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  // Save local-only markup preferences once the explicit table save succeeds.
  const persistMarkupPreferences = (
    nextMapsToById: Record<string, string>,
    nextDisplayById: Record<string, "horizontal" | "vertical">,
  ) => {
    if (!projectId) return;
    try {
      localStorage.setItem(
        `prime-contract-markup-maps:${projectId}`,
        JSON.stringify(nextMapsToById),
      );
      localStorage.setItem(
        `prime-contract-markup-display:${projectId}`,
        JSON.stringify(nextDisplayById),
      );
    } catch {
      // ignore localStorage write failures
    }
  };

  const hasUnsavedMarkupChanges = useMemo(() => {
    const normalize = (
      rows: VerticalMarkup[],
      mapsToById: Record<string, string>,
      displayById: Record<string, "horizontal" | "vertical">,
    ) =>
      [...rows]
        .sort((a, b) => a.calculation_order - b.calculation_order)
        .map((row) => ({
          id: row.id,
          markup_type: row.markup_type.trim(),
          percentage: Number(row.percentage),
          compound: Boolean(row.compound),
          maps_to_budget_code_id:
            mapsToById[row.id] ?? row.maps_to_budget_code_id ?? "all",
          display_in: displayById[row.id] ?? "horizontal",
        }));
    return (
      JSON.stringify(normalize(verticalMarkups, markupMapsToById, markupDisplayById)) !==
      JSON.stringify(
        normalize(
          savedVerticalMarkups,
          savedMarkupMapsToById,
          savedMarkupDisplayById,
        ),
      )
    );
  }, [
    markupDisplayById,
    markupMapsToById,
    savedMarkupDisplayById,
    savedMarkupMapsToById,
    savedVerticalMarkups,
    verticalMarkups,
  ]);

  const handleDeleteMarkup = async (markupId: string) => {
    setDeletingMarkupId(markupId);
    try {
      await apiFetch(
        `/api/projects/${projectId}/vertical-markup?markupId=${markupId}`,
        { method: "DELETE" },
      );
      const nextMapsToById = Object.fromEntries(
        Object.entries(markupMapsToById).filter(([key]) => key !== markupId),
      );
      const nextDisplayById = Object.fromEntries(
        Object.entries(markupDisplayById).filter(([key]) => key !== markupId),
      ) as Record<string, "horizontal" | "vertical">;

      setVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setSavedVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setMarkupMapsToById(nextMapsToById);
      setSavedMarkupMapsToById(nextMapsToById);
      setMarkupDisplayById(nextDisplayById);
      setSavedMarkupDisplayById(nextDisplayById);
      setEditingMarkupRowIds((prev) => {
        const next = { ...prev };
        delete next[markupId];
        return next;
      });
      persistMarkupPreferences(nextMapsToById, nextDisplayById);
      toast.success("Markup deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete markup");
    } finally {
      setDeletingMarkupId(null);
    }
  };

  const handleAddMarkupInline = async () => {
    setIsSubmittingMarkup(true);
    const nextMarkupType = getNextAvailableMarkupType(verticalMarkups);
    if (!nextMarkupType) {
      setIsSubmittingMarkup(false);
      toast.error("All available markup types are already added.");
      return;
    }
    try {
      const data = await apiFetch<{ data: VerticalMarkup }>(`/api/projects/${projectId}/vertical-markup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markup_type: nextMarkupType,
          percentage: 0,
          compound: false,
        }),
      });
      const newMarkup: VerticalMarkup = data.data;
      setVerticalMarkups((prev) => [...prev, newMarkup]);
      setSavedVerticalMarkups((prev) => [...prev, newMarkup]);
      setEditingMarkupRowIds((prev) => ({ ...prev, [newMarkup.id]: true }));
      toast.success("Markup row added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add markup");
    } finally {
      setIsSubmittingMarkup(false);
    }
  };

  const handleStartMarkupRowEdit = (markup: VerticalMarkup) => {
    setEditingMarkupRowIds((prev) => ({ ...prev, [markup.id]: true }));
  };

  // Apply an inline row edit to the working draft so the top-level save is the only commit step.
  const handleMarkupFieldChange = <K extends keyof Pick<VerticalMarkup, "markup_type" | "percentage" | "compound">>(
    markupId: string,
    field: K,
    value: VerticalMarkup[K],
  ) => {
    setVerticalMarkups((prev) =>
      prev.map((row) =>
        row.id === markupId
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  const handleSaveMarkupTable = async () => {
    const markupsToPersist = [...verticalMarkups]
      .sort((a, b) => a.calculation_order - b.calculation_order)
      .map((markup, index) => ({
        ...markup,
        markup_type: markup.markup_type.trim(),
        percentage: Number(markup.percentage),
        calculation_order: index + 1,
        maps_to_budget_code_id:
          markupMapsToById[markup.id] && markupMapsToById[markup.id] !== "all"
            ? markupMapsToById[markup.id]
            : null,
      }));

    if (markupsToPersist.some((markup) => !markup.markup_type)) {
      toast.error("Each markup row needs a name");
      return;
    }

    const duplicateMarkupTypes = findDuplicateMarkupTypes(markupsToPersist);
    if (duplicateMarkupTypes.length > 0) {
      toast.error(
        `Markup names must be unique. Duplicate: ${duplicateMarkupTypes
          .map((name) => `"${name}"`)
          .join(", ")}`,
      );
      return;
    }

    if (
      markupsToPersist.some(
        (markup) =>
          Number.isNaN(markup.percentage) ||
          markup.percentage < 0 ||
          markup.percentage > 100,
      )
    ) {
      toast.error("Percentages must be between 0 and 100");
      return;
    }

    setIsSavingMarkupTable(true);
    try {
      const data = await apiFetch<{ markups?: VerticalMarkup[] }>(`/api/projects/${projectId}/vertical-markup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markups: markupsToPersist }),
      });
      const updatedMarkups: VerticalMarkup[] = normalizeVerticalMarkupRows(
        data.markups || [],
      );
      setVerticalMarkups(updatedMarkups);
      setSavedVerticalMarkups(updatedMarkups);
      setSavedMarkupMapsToById({ ...markupMapsToById });
      setSavedMarkupDisplayById({ ...markupDisplayById });
      setEditingMarkupRowIds({});
      persistMarkupPreferences(markupMapsToById, markupDisplayById);
      toast.success("Markup changes saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save markup table");
    } finally {
      setIsSavingMarkupTable(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h3 className="text-xl font-semibold">Financial Markup</h3>
        <p className="text-sm text-muted-foreground">
          Add percentage-based markups (e.g., tax, overhead, profit, insurance) to contract values.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Use the row menu to edit a markup. Changes are only applied after you click Save Changes.
          </p>
          <div className="flex items-center gap-2">
            {hasUnsavedMarkupChanges ? (
              <Button
                size="sm"
                onClick={handleSaveMarkupTable}
                disabled={isSavingMarkupTable}
              >
                {isSavingMarkupTable ? "Saving..." : "Save Changes"}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddMarkupInline}
              disabled={isSubmittingMarkup}
            >
              <Plus />
              {isSubmittingMarkup ? "Adding..." : "Add Markup"}
            </Button>
          </div>
        </div>

        <InlineTable variant="edit">
          <InlineTableHeader>
            <InlineTableHeaderRow>
              <InlineTableHeaderCell>Markup Name</InlineTableHeaderCell>
              <InlineTableHeaderCell>Display In</InlineTableHeaderCell>
              <InlineTableHeaderCell>Maps To</InlineTableHeaderCell>
              <InlineTableHeaderCell align="right">%</InlineTableHeaderCell>
              <InlineTableHeaderCell>Calculation Type</InlineTableHeaderCell>
              <InlineTableHeaderCell align="right">Actions</InlineTableHeaderCell>
            </InlineTableHeaderRow>
          </InlineTableHeader>
          <InlineTableBody>
            {markupsLoading ? (
              <InlineTableRow>
                <InlineTableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Loading markup settings...
                </InlineTableCell>
              </InlineTableRow>
            ) : verticalMarkups.length === 0 ? (
              <InlineTableRow>
                <InlineTableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No markup items configured. Click &quot;Add Markup&quot; to get started.
                </InlineTableCell>
              </InlineTableRow>
            ) : (
              [...verticalMarkups]
                .sort((a, b) => a.calculation_order - b.calculation_order)
                .map((markup) => {
                  const isEditingRow = Boolean(editingMarkupRowIds[markup.id]);
                  const displayIn = markupDisplayById[markup.id] ?? "horizontal";
                  const mapsTo = markupMapsToById[markup.id] ?? "all";
                  const mapsToLabel =
                    mapsTo === "all"
                      ? "All Budget Codes"
                      : budgetCodes.find((code) => code.id === mapsTo)?.fullLabel ?? "All Budget Codes";

                  return (
                    <InlineTableRow key={markup.id}>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <Select
                            value={markup.markup_type}
                            onValueChange={(value) =>
                              handleMarkupFieldChange(
                                markup.id,
                                "markup_type",
                                value,
                              )
                            }
                          >
                            <SelectTrigger size="sm" className="w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="bond">Bond</SelectItem>
                              <SelectItem value="fee">Fee</SelectItem>
                              <SelectItem value="overhead">Overhead</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-foreground capitalize">{markup.markup_type}</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <Select
                            value={displayIn}
                            onValueChange={(value) =>
                              setMarkupDisplayById((prev) => ({
                                ...prev,
                                [markup.id]: value as "horizontal" | "vertical",
                              }))
                            }
                          >
                            <SelectTrigger size="sm" className="w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="horizontal">Horizontal</SelectItem>
                              <SelectItem value="vertical">Vertical</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-foreground capitalize">{displayIn}</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <Select
                            value={mapsTo}
                            onValueChange={(value) =>
                              setMarkupMapsToById((prev) => ({
                                ...prev,
                                [markup.id]: value,
                              }))
                            }
                          >
                            <SelectTrigger size="sm" className="w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Budget Codes</SelectItem>
                              {budgetCodes.map((code) => (
                                <SelectItem key={code.id} value={code.id}>
                                  {code.fullLabel}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-foreground">{mapsToLabel}</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell align="right">
                        {isEditingRow ? (
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.001"
                            value={String(markup.percentage)}
                            onChange={(e) =>
                              handleMarkupFieldChange(
                                markup.id,
                                "percentage",
                                Number(e.target.value || 0),
                              )
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          <span className="text-sm text-foreground">{Number(markup.percentage).toFixed(2)}%</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <Select
                            value={markup.compound ? "compound" : "basic"}
                            onValueChange={(value) =>
                              handleMarkupFieldChange(
                                markup.id,
                                "compound",
                                value === "compound",
                              )
                            }
                          >
                            <SelectTrigger size="sm" className="w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic Calculation</SelectItem>
                              <SelectItem value="compound">Compounds All Above</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-foreground">
                            {markup.compound ? "Compounds All Above" : "Basic Calculation"}
                          </span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell align="right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Open actions for ${markup.markup_type}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartMarkupRowEdit(markup)}>
                              {isEditingRow ? "Continue editing" : "Edit"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteMarkup(markup.id)}
                              disabled={deletingMarkupId === markup.id}
                            >
                              {deletingMarkupId === markup.id ? "Deleting..." : "Delete"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </InlineTableCell>
                    </InlineTableRow>
                  );
                })
            )}
          </InlineTableBody>
        </InlineTable>
      </section>
    </div>
  );
}
