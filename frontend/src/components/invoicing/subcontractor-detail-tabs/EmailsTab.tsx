"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatDateTime } from "./shared";

interface EmailRow {
  id: number;
  sent_by_email: string | null;
  to_recipients: string[];
  cc_recipients: string[];
  subject: string | null;
  email_type: string;
  sent_at: string;
  status: string;
}

export function EmailsTab({
  projectId,
  invoiceId,
}: {
  projectId: string;
  invoiceId: number;
}) {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/projects/${projectId}/invoicing/subcontractor/invoices/${invoiceId}/emails`,
        );
        const body = await res.json();
        if (res.ok) setRows(body.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, invoiceId]);

  return (
    <section className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Emails</h2>
        <p className="text-xs text-muted-foreground">
          History of emails sent for this invoice.
        </p>
      </div>
      {loading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <Mail className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No emails sent yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground">
                  {formatDateTime(r.sent_at)}
                </TableCell>
                <TableCell>{r.sent_by_email ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.to_recipients.join(", ")}
                </TableCell>
                <TableCell className="font-medium">
                  {r.subject ?? "—"}
                </TableCell>
                <TableCell className="capitalize">
                  {r.email_type.replace(/_/g, " ")}
                </TableCell>
                <TableCell className="capitalize">{r.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
