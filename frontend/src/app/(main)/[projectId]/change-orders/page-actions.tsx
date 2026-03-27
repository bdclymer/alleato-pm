"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface PageActionsProps {
  projectId: string;
  tab?: "prime" | "commitment";
}

export function PageActions({ projectId, tab = "prime" }: PageActionsProps) {
  const createHref =
    tab === "prime"
      ? `/${projectId}/change-orders/prime/new`
      : `/${projectId}/change-orders/commitment/new`;

  const label =
    tab === "prime" ? "New Prime Contract CO" : "New Commitment CO";

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
    <>
      <div className="hidden items-center gap-2 sm:flex">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download />
          Export CSV
        </Button>
        <Button asChild size="sm" data-testid="change-orders-create-button">
          <Link href={createHref}>{label}</Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-9 w-9 rounded-full border-brand p-0 text-brand hover:bg-brand/10"
          aria-label="Create change order"
        >
          <Link href={createHref}>
            <Plus />
          </Link>
        </Button>
      </div>
    </>
  );
}
