"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatDate } from "./shared";

interface RelatedItem {
  id: number;
  related_type: string;
  related_id: string;
  description: string | null;
  linked_at: string;
}

export function RelatedItemsTab({
  projectId,
  invoiceId,
}: {
  projectId: string;
  invoiceId: number;
}) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/related-items`,
      );
      const body = await res.json();
      if (res.ok) setItems(body.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, invoiceId]);

  async function unlink(id: number) {
    const res = await fetch(
      `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/related-items?id=${id}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      toast.success("Unlinked");
      await load();
    } else {
      toast.error("Failed to unlink");
    }
  }

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Related Items</h2>
        <p className="text-xs text-muted-foreground">
          Change orders, RFIs, submittals, and other records linked to this
          invoice.
        </p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Link2 className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No related items linked yet.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Linked</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="font-medium capitalize">
                  {it.related_type.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {it.related_id}
                </TableCell>
                <TableCell>{it.description ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(it.linked_at)}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => unlink(it.id)}
                    aria-label="Unlink"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
