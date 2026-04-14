"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
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
  const [showAddMarkupDialog, setShowAddMarkupDialog] = useState(false);
  const [editingMarkup, setEditingMarkup] = useState<VerticalMarkup | null>(null);
  const [markupForm, setMarkupForm] = useState({
    markup_type: "",
    percentage: "",
    compound: false,
  });
  const [markupMapsToById, setMarkupMapsToById] = useState<Record<string, string>>({});
  const [markupDisplayById, setMarkupDisplayById] = useState<Record<string, "horizontal" | "vertical">>({});
  const [editingMarkupRowIds, setEditingMarkupRowIds] = useState<Record<string, boolean>>({});
  const [markupRowDrafts, setMarkupRowDrafts] = useState<
    Record<
      string,
      {
        markup_type: string;
        percentage: number;
        compound: boolean;
        displayIn: "horizontal" | "vertical";
        mapsTo: string;
      }
    >
  >({});

  // Load local "maps to budget code" selections for markup rows
  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-maps:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === "object") {
        setMarkupMapsToById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-maps:${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(markupMapsToById));
    } catch {
      // ignore localStorage write failures
    }
  }, [projectId, markupMapsToById]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-display:${projectId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, "horizontal" | "vertical">;
      if (parsed && typeof parsed === "object") {
        setMarkupDisplayById(parsed);
      }
    } catch {
      // ignore localStorage parse issues
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const storageKey = `prime-contract-markup-display:${projectId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(markupDisplayById));
    } catch {
      // ignore localStorage write failures
    }
  }, [projectId, markupDisplayById]);

  const hasUnsavedMarkupChanges = useMemo(() => {
    const normalize = (rows: VerticalMarkup[]) =>
      [...rows]
        .sort((a, b) => a.calculation_order - b.calculation_order)
        .map((row) => ({
          id: row.id,
          markup_type: row.markup_type.trim(),
          percentage: Number(row.percentage),
          compound: Boolean(row.compound),
        }));
    return JSON.stringify(normalize(verticalMarkups)) !== JSON.stringify(normalize(savedVerticalMarkups));
  }, [verticalMarkups, savedVerticalMarkups]);

  const resetMarkupForm = () => {
    setMarkupForm({ markup_type: "", percentage: "", compound: false });
    setEditingMarkup(null);
  };

  const handleSubmitMarkup = async () => {
    if (!markupForm.markup_type.trim() || !markupForm.percentage) {
      toast.error("Markup name and percentage are required");
      return;
    }

    const pct = parseFloat(markupForm.percentage);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Percentage must be between 0 and 100");
      return;
    }

    setIsSubmittingMarkup(true);
    try {
      if (editingMarkup) {
        const updatedMarkups = verticalMarkups.map((m) =>
          m.id === editingMarkup.id
            ? { ...m, markup_type: markupForm.markup_type.trim(), percentage: pct, compound: markupForm.compound }
            : m,
        );
        const data = await apiFetch<{ markups?: VerticalMarkup[] }>(`/api/projects/${projectId}/vertical-markup`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ markups: updatedMarkups }),
        });
        const normalized = normalizeVerticalMarkupRows(data.markups || []);
        setVerticalMarkups(normalized);
        setSavedVerticalMarkups(normalized);
        toast.success("Markup updated");
      } else {
        const data = await apiFetch<{ data: VerticalMarkup }>(`/api/projects/${projectId}/vertical-markup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            markup_type: markupForm.markup_type.trim(),
            percentage: pct,
            compound: markupForm.compound,
          }),
        });
        setVerticalMarkups((prev) => [...prev, data.data]);
        toast.success("Markup added");
      }
      setShowAddMarkupDialog(false);
      resetMarkupForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save markup");
    } finally {
      setIsSubmittingMarkup(false);
    }
  };

  const handleDeleteMarkup = async (markupId: string) => {
    setDeletingMarkupId(markupId);
    try {
      await apiFetch(
        `/api/projects/${projectId}/vertical-markup?markupId=${markupId}`,
        { method: "DELETE" },
      );
      setVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setSavedVerticalMarkups((prev) => prev.filter((m) => m.id !== markupId));
      setMarkupMapsToById((prev) => {
        const next = { ...prev };
        delete next[markupId];
        return next;
      });
      setMarkupDisplayById((prev) => {
        const next = { ...prev };
        delete next[markupId];
        return next;
      });
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
      toast.success("Markup row added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add markup");
    } finally {
      setIsSubmittingMarkup(false);
    }
  };

  const handleStartMarkupRowEdit = (markup: VerticalMarkup) => {
    const displayIn = markupDisplayById[markup.id] ?? "horizontal";
    const mapsTo = markupMapsToById[markup.id] ?? "all";
    setMarkupRowDrafts((prev) => ({
      ...prev,
      [markup.id]: {
        markup_type: markup.markup_type,
        percentage: Number(markup.percentage) || 0,
        compound: Boolean(markup.compound),
        displayIn,
        mapsTo,
      },
    }));
    setEditingMarkupRowIds((prev) => ({ ...prev, [markup.id]: true }));
  };

  const handleCancelMarkupRowEdit = (markupId: string) => {
    setEditingMarkupRowIds((prev) => {
      const next = { ...prev };
      delete next[markupId];
      return next;
    });
    setMarkupRowDrafts((prev) => {
      const next = { ...prev };
      delete next[markupId];
      return next;
    });
  };

  const handleSaveMarkupRowEdit = (markupId: string) => {
    const draft = markupRowDrafts[markupId];
    if (!draft) return;

    setVerticalMarkups((prev) =>
      prev.map((row) =>
        row.id === markupId
          ? {
              ...row,
              markup_type: draft.markup_type,
              percentage: Number(draft.percentage) || 0,
              compound: Boolean(draft.compound),
            }
          : row,
      ),
    );
    setMarkupDisplayById((prev) => ({ ...prev, [markupId]: draft.displayIn }));
    setMarkupMapsToById((prev) => ({ ...prev, [markupId]: draft.mapsTo }));
    handleCancelMarkupRowEdit(markupId);
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
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveMarkupTable}
              disabled={isSavingMarkupTable || !hasUnsavedMarkupChanges}
            >
              {isSavingMarkupTable ? "Saving..." : "Save Changes"}
            </Button>
            <Button size="sm" onClick={handleAddMarkupInline} disabled={isSubmittingMarkup}>
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
                  const rowDraft = markupRowDrafts[markup.id];
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
                          <select
                            value={rowDraft?.markup_type ?? markup.markup_type}
                            onChange={(e) =>
                              setMarkupRowDrafts((prev) => ({
                                ...prev,
                                [markup.id]: {
                                  ...(prev[markup.id] ?? {
                                    markup_type: markup.markup_type,
                                    percentage: Number(markup.percentage) || 0,
                                    compound: Boolean(markup.compound),
                                    displayIn,
                                    mapsTo,
                                  }),
                                  markup_type: e.target.value,
                                },
                              }))
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="insurance">Insurance</option>
                            <option value="bond">Bond</option>
                            <option value="fee">Fee</option>
                            <option value="overhead">Overhead</option>
                            <option value="custom">Custom</option>
                          </select>
                        ) : (
                          <span className="text-sm text-foreground capitalize">{markup.markup_type}</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <select
                            value={rowDraft?.displayIn ?? displayIn}
                            onChange={(e) =>
                              setMarkupRowDrafts((prev) => ({
                                ...prev,
                                [markup.id]: {
                                  ...(prev[markup.id] ?? {
                                    markup_type: markup.markup_type,
                                    percentage: Number(markup.percentage) || 0,
                                    compound: Boolean(markup.compound),
                                    displayIn,
                                    mapsTo,
                                  }),
                                  displayIn: e.target.value as "horizontal" | "vertical",
                                },
                              }))
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="horizontal">Horizontal</option>
                            <option value="vertical">Vertical</option>
                          </select>
                        ) : (
                          <span className="text-sm text-foreground capitalize">{displayIn}</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <select
                            value={rowDraft?.mapsTo ?? mapsTo}
                            onChange={(e) =>
                              setMarkupRowDrafts((prev) => ({
                                ...prev,
                                [markup.id]: {
                                  ...(prev[markup.id] ?? {
                                    markup_type: markup.markup_type,
                                    percentage: Number(markup.percentage) || 0,
                                    compound: Boolean(markup.compound),
                                    displayIn,
                                    mapsTo,
                                  }),
                                  mapsTo: e.target.value,
                                },
                              }))
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="all">All Budget Codes</option>
                            {budgetCodes.map((code) => (
                              <option key={code.id} value={code.id}>
                                {code.fullLabel}
                              </option>
                            ))}
                          </select>
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
                            value={String(rowDraft?.percentage ?? markup.percentage)}
                            onChange={(e) =>
                              setMarkupRowDrafts((prev) => ({
                                ...prev,
                                [markup.id]: {
                                  ...(prev[markup.id] ?? {
                                    markup_type: markup.markup_type,
                                    percentage: Number(markup.percentage) || 0,
                                    compound: Boolean(markup.compound),
                                    displayIn,
                                    mapsTo,
                                  }),
                                  percentage: Number(e.target.value || 0),
                                },
                              }))
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          <span className="text-sm text-foreground">{Number(markup.percentage).toFixed(2)}%</span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell>
                        {isEditingRow ? (
                          <select
                            value={(rowDraft?.compound ?? markup.compound) ? "compound" : "basic"}
                            onChange={(e) =>
                              setMarkupRowDrafts((prev) => ({
                                ...prev,
                                [markup.id]: {
                                  ...(prev[markup.id] ?? {
                                    markup_type: markup.markup_type,
                                    percentage: Number(markup.percentage) || 0,
                                    compound: Boolean(markup.compound),
                                    displayIn,
                                    mapsTo,
                                  }),
                                  compound: e.target.value === "compound",
                                },
                              }))
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          >
                            <option value="basic">Basic Calculation</option>
                            <option value="compound">Compounds All Above</option>
                          </select>
                        ) : (
                          <span className="text-sm text-foreground">
                            {markup.compound ? "Compounds All Above" : "Basic Calculation"}
                          </span>
                        )}
                      </InlineTableCell>
                      <InlineTableCell align="right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditingRow ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleSaveMarkupRowEdit(markup.id)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleCancelMarkupRowEdit(markup.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleStartMarkupRowEdit(markup)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteMarkup(markup.id)}
                            disabled={deletingMarkupId === markup.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </InlineTableCell>
                    </InlineTableRow>
                  );
                })
            )}
          </InlineTableBody>
        </InlineTable>
      </section>

      {/* Add/Edit Markup Dialog */}
      <Modal open={showAddMarkupDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddMarkupDialog(false);
          resetMarkupForm();
        }
      }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{editingMarkup ? "Edit Markup" : "Add Markup"}</ModalTitle>
            <ModalDescription>
              {editingMarkup
                ? "Update the markup name, percentage, and calculation type."
                : "Add a percentage-based markup such as tax, overhead, profit, or insurance."}
            </ModalDescription>
          </ModalHeader>
          <div className="space-y-4 px-6 py-2">
            <div className="space-y-2">
              <Label htmlFor="markup-name">Markup Type</Label>
              <select
                id="markup-name"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={markupForm.markup_type}
                onChange={(e) =>
                  setMarkupForm((prev) => ({ ...prev, markup_type: e.target.value }))
                }
              >
                <option value="">Select markup type...</option>
                <option value="insurance">Insurance</option>
                <option value="bond">Bond</option>
                <option value="fee">Fee</option>
                <option value="overhead">Overhead</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="markup-percentage">Percentage (%)</Label>
              <Input
                id="markup-percentage"
                type="number"
                step="0.001"
                min="0"
                max="100"
                placeholder="e.g., 10.000"
                value={markupForm.percentage}
                onChange={(e) =>
                  setMarkupForm((prev) => ({ ...prev, percentage: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="markup-compound"
                type="checkbox"
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                checked={markupForm.compound}
                onChange={(e) =>
                  setMarkupForm((prev) => ({ ...prev, compound: e.target.checked }))
                }
              />
              <div>
                <Label htmlFor="markup-compound" className="cursor-pointer">Compound Markup</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, this markup is calculated on the subtotal plus all previous markups.
                </p>
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMarkupDialog(false);
                resetMarkupForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitMarkup}
              disabled={isSubmittingMarkup || !markupForm.markup_type.trim() || !markupForm.percentage}
            >
              {isSubmittingMarkup ? "Saving..." : editingMarkup ? "Update" : "Add Markup"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
