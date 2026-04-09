"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  formatCurrency,
  type LineItemEdits,
  type SovLineItem,
} from "./shared";

interface DetailTabProps {
  projectId: string;
  invoiceId: number;
  lineItems: SovLineItem[];
  canEdit: boolean;
  onRefetch: () => Promise<unknown>;
}

export function DetailTab({
  projectId,
  invoiceId,
  lineItems,
  canEdit,
  onRefetch,
}: DetailTabProps) {
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<LineItemEdits>({});
  const [busy, setBusy] = useState(false);

  // Optimistic display list reflecting in-progress edits
  const displayLineItems = useMemo(() => {
    if (!editing) return lineItems;
    return lineItems.map((li) => {
      const e = edits[li.id];
      if (!e) return li;
      const scheduled = Number(li.scheduled_value) || 0;
      const previous = Number(li.work_completed_previous) || 0;
      const thisPeriod = Number(e.work_completed_period) || 0;
      const stored = Number(e.materials_stored) || 0;
      const workPct = Number(e.retainage_pct) || 0;
      const matPct = Number(e.materials_retainage_pct) || 0;
      const totalCompleted = previous + thisPeriod + stored;
      const workRetainage = ((previous + thisPeriod) * workPct) / 100;
      const matRetainage = (stored * matPct) / 100;
      return {
        ...li,
        work_completed_period: thisPeriod,
        materials_stored: stored,
        retainage_pct: workPct,
        materials_retainage_pct: matPct,
        retainage_amount: workRetainage,
        materials_retainage_amount: matRetainage,
        total_completed_stored: totalCompleted,
        work_completed_pct:
          scheduled > 0 ? (totalCompleted / scheduled) * 100 : 0,
        balance_to_finish: scheduled - totalCompleted,
        net_amount_this_period:
          thisPeriod + stored - (workRetainage + matRetainage),
      };
    });
  }, [editing, edits, lineItems]);

  const totals = displayLineItems.reduce(
    (acc, li) => {
      acc.scheduled += li.scheduled_value ?? 0;
      acc.previous += li.work_completed_previous ?? 0;
      acc.thisPeriod += li.work_completed_period ?? 0;
      acc.stored += li.materials_stored ?? 0;
      acc.totalCompleted += li.total_completed_stored ?? 0;
      acc.workRetainage += li.retainage_amount ?? 0;
      acc.matRetainage += li.materials_retainage_amount ?? 0;
      acc.net += li.net_amount_this_period ?? 0;
      return acc;
    },
    {
      scheduled: 0,
      previous: 0,
      thisPeriod: 0,
      stored: 0,
      totalCompleted: 0,
      workRetainage: 0,
      matRetainage: 0,
      net: 0,
    },
  );

  function enterEdit() {
    const seed: LineItemEdits = {};
    for (const li of lineItems) {
      seed[li.id] = {
        work_completed_period: String(li.work_completed_period ?? 0),
        materials_stored: String(li.materials_stored ?? 0),
        retainage_pct: String(li.retainage_pct ?? 0),
        materials_retainage_pct: String(li.materials_retainage_pct ?? 0),
      };
    }
    setEdits(seed);
    setEditing(true);
  }

  function cancelEdit() {
    setEdits({});
    setEditing(false);
  }

  async function saveEdits() {
    const updates = Object.entries(edits).map(([id, v]) => ({
      id: Number(id),
      work_completed_period: Number(v.work_completed_period) || 0,
      materials_stored: Number(v.materials_stored) || 0,
      retainage_pct: Number(v.retainage_pct) || 0,
      materials_retainage_pct: Number(v.materials_retainage_pct) || 0,
    }));
    setBusy(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/line-items`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save line items");
      }
      toast.success("SOV updated");
      setEditing(false);
      setEdits({});
      await onRefetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Schedule of Values (G703)
          </h2>
          <p className="text-xs text-muted-foreground">
            {lineItems.length} line item
            {lineItems.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && lineItems.length > 0 && (
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={cancelEdit}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" disabled={busy} onClick={saveEdits}>
                  Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={enterEdit}>
                <Pencil className="h-4 w-4 mr-1" /> Edit SOV
              </Button>
            )}
          </div>
        )}
      </div>
      {lineItems.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No line items yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Description Of Work</TableHead>
                <TableHead className="text-right">Scheduled Value</TableHead>
                <TableHead className="text-right">From Previous</TableHead>
                <TableHead className="text-right">This Period</TableHead>
                <TableHead className="text-right">Materials Stored</TableHead>
                <TableHead className="text-right">Total Completed</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Balance To Finish</TableHead>
                <TableHead className="text-right">Work Retainage %</TableHead>
                <TableHead className="text-right">Work Retainage $</TableHead>
                <TableHead className="text-right">Materials Retainage %</TableHead>
                <TableHead className="text-right">Materials Retainage $</TableHead>
                <TableHead className="text-right">Net This Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLineItems.map((li, idx) => {
                const e = edits[li.id];
                return (
                  <TableRow key={li.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {li.sort_order ?? idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {li.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.scheduled_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.work_completed_previous)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {editing && e ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="h-8 w-28 ml-auto text-right tabular-nums"
                          value={e.work_completed_period}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [li.id]: {
                                ...prev[li.id],
                                work_completed_period: ev.target.value,
                              },
                            }))
                          }
                        />
                      ) : (
                        formatCurrency(li.work_completed_period)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {editing && e ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="h-8 w-28 ml-auto text-right tabular-nums"
                          value={e.materials_stored}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [li.id]: {
                                ...prev[li.id],
                                materials_stored: ev.target.value,
                              },
                            }))
                          }
                        />
                      ) : (
                        formatCurrency(li.materials_stored)
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.total_completed_stored)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {li.work_completed_pct != null
                        ? `${Number(li.work_completed_pct).toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.balance_to_finish)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {editing && e ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="h-8 w-20 ml-auto text-right tabular-nums"
                          value={e.retainage_pct}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [li.id]: {
                                ...prev[li.id],
                                retainage_pct: ev.target.value,
                              },
                            }))
                          }
                        />
                      ) : li.retainage_pct != null ? (
                        `${Number(li.retainage_pct).toFixed(2)}%`
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.retainage_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {editing && e ? (
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          className="h-8 w-20 ml-auto text-right tabular-nums"
                          value={e.materials_retainage_pct}
                          onChange={(ev) =>
                            setEdits((prev) => ({
                              ...prev,
                              [li.id]: {
                                ...prev[li.id],
                                materials_retainage_pct: ev.target.value,
                              },
                            }))
                          }
                        />
                      ) : li.materials_retainage_pct != null ? (
                        `${Number(li.materials_retainage_pct).toFixed(2)}%`
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(li.materials_retainage_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(li.net_amount_this_period)}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={2}>Totals</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.scheduled)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.previous)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.thisPeriod)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.stored)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.totalCompleted)}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.workRetainage)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.matRetainage)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(totals.net)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
