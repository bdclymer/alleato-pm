"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/domain/permissions/PermissionGate";

interface PageActionsProps {
  projectId: string;
  tab?: "prime" | "commitment";
}

export function PageActions({ projectId, tab = "prime" }: PageActionsProps) {
  const createHref =
    tab === "prime"
      ? `/${projectId}/prime-contract-pcos/new`
      : `/${projectId}/commitment-pcos/new`;

  const label =
    tab === "prime" ? "New Prime PCO" : "New Commitment PCO";

  const handleExport = async () => {
    try {
      const exportPath =
        tab === "prime"
          ? `/api/projects/${projectId}/prime-contract-change-orders/export`
          : `/api/projects/${projectId}/commitment-change-orders/export`;

      const res = await fetch(exportPath);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        tab === "prime"
          ? "prime-contract-change-orders.csv"
          : "commitment-change-orders.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
        <Download />
        Export CSV
      </Button>
      <PermissionGate projectId={projectId} module="change_orders" level="write">
        <Button asChild size="sm" data-testid="change-orders-create-button">
          <Link href={createHref}>
            <Plus />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">Create</span>
          </Link>
        </Button>
      </PermissionGate>
    </div>
  );
}
