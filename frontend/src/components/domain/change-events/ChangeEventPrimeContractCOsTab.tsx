"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

import { EmptyState, StatusBadge } from "@/components/ds";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ── Types ──────────────────────────────────────────────────────────── */

interface PrimeContract {
  id: string;
  number: string | null;
  title: string;
}

interface PrimeCO {
  id: string;
  pcco_number: string | null;
  title: string;
  status: string | null;
  total_amount: number | null;
  created_at: string | null;
  linked_at: string | null;
  contract: PrimeContract | null;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}


/* ── Component ──────────────────────────────────────────────────────── */

interface ChangeEventPrimeContractCOsTabProps {
  changeEventId: string;
  projectId: number;
}

export function ChangeEventPrimeContractCOsTab({
  changeEventId,
  projectId,
}: ChangeEventPrimeContractCOsTabProps) {
  const [pcos, setPcos] = useState<PrimeCO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPcos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(
        `/api/projects/${projectId}/change-events/${changeEventId}/prime-contract-change-orders`,
      );

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Failed to load prime contract change orders");
        return;
      }

      const json = await res.json();
      setPcos(Array.isArray(json) ? json : (json.data ?? []));
    } catch {
      setError("Failed to load prime contract change orders");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, changeEventId]);

  useEffect(() => {
    fetchPcos();
  }, [fetchPcos]);

  /* ── Loading ────────────────────────────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────── */

  if (error) {
    return (
      <div className="pt-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  /* ── Empty ──────────────────────────────────────────────────────── */

  if (pcos.length === 0) {
    return (
      <div className="pt-4">
        <EmptyState
          icon={<FileText />}
          title="No Prime Contract Change Orders"
          description="Use 'Add to' on the change events list to create a PCO from this change event."
        />
      </div>
    );
  }

  /* ── Table ──────────────────────────────────────────────────────── */

  return (
    <div className="pt-4">
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PCCO #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Prime Contract</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pcos.map((pco) => (
              <TableRow key={pco.id}>
                <TableCell className="font-medium text-foreground">
                  {pco.pcco_number ?? `PCCO-${pco.id}`}
                </TableCell>
                <TableCell className="text-foreground">{pco.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {pco.contract
                    ? (pco.contract.number
                        ? `${pco.contract.number} — ${pco.contract.title}`
                        : pco.contract.title)
                    : "—"}
                </TableCell>
                <TableCell>
                  {pco.status ? (
                    <StatusBadge status={pco.status} />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-foreground">
                  {formatCurrency(pco.total_amount)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(pco.created_at)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/${projectId}/prime-contracts/change-orders/${pco.id}`}
                    className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`View PCCO ${pco.pcco_number ?? pco.id}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
