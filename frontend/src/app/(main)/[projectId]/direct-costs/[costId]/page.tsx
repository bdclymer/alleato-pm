"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageShell, ContentSectionStack, SectionRuleHeading, LabelValueRow } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/table-config/formatters";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Slideover, SlideoverContent, SlideoverHeader, SlideoverTitle } from "@/components/ui/unified-slideover";
import { DirectCostForm } from "@/components/direct-costs/DirectCostForm";
import type { DirectCostUpdate } from "@/lib/schemas/direct-costs";

interface DirectCostDetailPageProps {
  params: Promise<{
    projectId: string;
    costId: string;
  }>;
}

interface LineItem {
  id: string;
  description: string | null;
  quantity: number;
  uom: string;
  unit_cost: number;
  line_total: number;
  line_order: number;
  budget_code: { code: string; description: string } | null;
}

interface DirectCostDetail {
  id: string;
  project_id: number;
  date: string;
  cost_type: string;
  status: string;
  description: string | null;
  total_amount: number;
  invoice_number: string | null;
  received_date: string | null;
  paid_date: string | null;
  acumatica_ref_nbr: string | null;
  acumatica_doc_type: string | null;
  acumatica_sync_at: string | null;
  created_at: string;
  updated_at: string;
  vendor: { id: string; name: string } | null;
  employee: { id: string; first_name: string; last_name: string } | null;
  line_items: LineItem[];
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "Approved":
      return "default";
    case "Pending":
      return "secondary";
    case "Revise and Resubmit":
      return "destructive";
    default:
      return "outline";
  }
}

export default function DirectCostDetailPage({
  params,
}: DirectCostDetailPageProps) {
  const router = useRouter();
  const [directCost, setDirectCost] = useState<DirectCostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState<DirectCostUpdate | undefined>(
    undefined,
  );
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [resolvedParams, setResolvedParams] = useState<{
    projectId: string;
    costId: string;
  } | null>(null);

  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  useEffect(() => {
    if (!resolvedParams) return;

    const fetchDirectCost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/projects/${resolvedParams.projectId}/direct-costs/${resolvedParams.costId}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch direct cost");
        }

        const data = await response.json();
        setDirectCost(data);
      } catch {
        toast.error("Failed to load direct cost details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDirectCost();
  }, [resolvedParams]);

  const handleDelete = async () => {
    if (!resolvedParams) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `/api/projects/${resolvedParams.projectId}/direct-costs/${resolvedParams.costId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        throw new Error("Failed to delete direct cost");
      }

      toast.success("Direct cost deleted successfully");
      router.push(`/${resolvedParams.projectId}/direct-costs`);
    } catch {
      toast.error("Failed to delete direct cost");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleOpenEdit = async () => {
    if (!resolvedParams) return;
    setIsEditOpen(true);
    setIsEditLoading(true);
    setEditData(undefined);

    try {
      const response = await fetch(
        `/api/projects/${resolvedParams.projectId}/direct-costs/${resolvedParams.costId}`,
      );
      if (!response.ok) throw new Error("Failed to load for editing");
      const payload = (await response.json()) as DirectCostUpdate;
      setEditData(payload);
    } catch {
      toast.error("Failed to load direct cost for editing");
      setIsEditOpen(false);
    } finally {
      setIsEditLoading(false);
    }
  };

  if (!resolvedParams || isLoading) {
    return (
      <PageShell variant="detail" title="Direct Cost Details" onBack={() => router.back()}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageShell>
    );
  }

  if (!directCost) {
    return (
      <PageShell variant="detail" title="Direct Cost Details" description="Direct cost not found" onBack={() => router.back()}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-muted-foreground">Direct cost not found</p>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/${resolvedParams.projectId}/direct-costs`)
            }
          >
            <ArrowLeft />
            Back to Direct Costs
          </Button>
        </div>
      </PageShell>
    );
  }

  const lineItemsTotal = directCost.line_items?.reduce(
    (sum, li) => sum + (li.line_total ?? li.quantity * li.unit_cost),
    0,
  ) ?? 0;

  return (
    <>
      <PageShell
        variant="detail"
        title="Direct Cost Details"
        description={directCost.invoice_number ? `Invoice #${directCost.invoice_number}` : `#${directCost.id.slice(0, 8)}`}
        onBack={() => router.back()}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      >
        <ContentSectionStack>
          {/* Cost Information + Record Info */}
          <section>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-x-16 gap-y-10">
              <div className="space-y-6">
                <SectionRuleHeading label="Cost Information" className="[&_span]:text-primary" />
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{directCost.cost_type}</Badge>
                  <Badge variant={statusVariant(directCost.status)}>
                    {directCost.status}
                  </Badge>
                </div>
                <dl className="space-y-4 text-sm">
                  <LabelValueRow label="Total Amount">
                    <span className="text-2xl font-semibold">
                      {formatCurrency(directCost.total_amount)}
                    </span>
                  </LabelValueRow>
                  <LabelValueRow label="Date">
                    {formatDate(directCost.date)}
                  </LabelValueRow>
                  {directCost.vendor ? (
                    <LabelValueRow label="Vendor">
                      {directCost.vendor.name}
                    </LabelValueRow>
                  ) : (
                    <LabelValueRow label="Vendor" missing />
                  )}
                  {directCost.employee ? (
                    <LabelValueRow label="Employee">
                      {directCost.employee.first_name}{" "}
                      {directCost.employee.last_name}
                    </LabelValueRow>
                  ) : null}
                  <LabelValueRow label="Invoice Number" missing={!directCost.invoice_number}>
                    {directCost.invoice_number}
                  </LabelValueRow>
                  {directCost.received_date && (
                    <LabelValueRow label="Received Date">
                      {formatDate(directCost.received_date)}
                    </LabelValueRow>
                  )}
                  {directCost.paid_date && (
                    <LabelValueRow label="Paid Date">
                      {formatDate(directCost.paid_date)}
                    </LabelValueRow>
                  )}
                  {directCost.acumatica_sync_at && (
                    <LabelValueRow label="Acumatica">
                      {directCost.acumatica_ref_nbr ? (
                        <a
                          href={`https://alleatogroup.acumatica.com/Main?ScreenId=PM304000&RefNbr=${encodeURIComponent(directCost.acumatica_ref_nbr)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          {directCost.acumatica_doc_type ? `${directCost.acumatica_doc_type} ` : ""}
                          {directCost.acumatica_ref_nbr}
                        </a>
                      ) : (
                        <Badge variant="outline">Synced</Badge>
                      )}
                    </LabelValueRow>
                  )}
                  {directCost.description && (
                    <LabelValueRow label="Description">
                      {directCost.description}
                    </LabelValueRow>
                  )}
                </dl>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <SectionRuleHeading label="Record Information" className="[&_span]:text-primary" />
                  <div className="rounded-md border border-border bg-muted p-6">
                    <dl className="space-y-3 text-sm">
                      <LabelValueRow label="Created">
                        {formatDate(directCost.created_at, "MMM d, yyyy HH:mm")}
                      </LabelValueRow>
                      {directCost.updated_at &&
                        directCost.updated_at !== directCost.created_at && (
                          <LabelValueRow label="Last Updated">
                            {formatDate(directCost.updated_at, "MMM d, yyyy HH:mm")}
                          </LabelValueRow>
                        )}
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Line Items */}
          {directCost.line_items && directCost.line_items.length > 0 && (
            <section>
              <div className="space-y-6">
                <SectionRuleHeading
                  label={`Line Items (${directCost.line_items.length})`}
                  className="[&_span]:text-primary"
                />
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Budget Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {directCost.line_items
                        .sort((a, b) => a.line_order - b.line_order)
                        .map((li) => (
                          <TableRow key={li.id}>
                            <TableCell className="font-medium">
                              {li.budget_code?.code ?? "-"}
                            </TableCell>
                            <TableCell>
                              {li.description ??
                                li.budget_code?.description ??
                                "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {li.quantity}
                            </TableCell>
                            <TableCell>{li.uom}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(li.unit_cost)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                li.line_total ?? li.quantity * li.unit_cost,
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={5} className="font-semibold">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(lineItemsTotal)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            </section>
          )}
        </ContentSectionStack>
      </PageShell>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Direct Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this direct cost? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Slideover */}
      <Slideover
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
      >
        <SlideoverContent
          side="right"
          className="w-[92vw] sm:max-w-3xl overflow-y-auto p-0"
        >
          <SlideoverHeader className="border-b p-4">
            <SlideoverTitle>Edit Direct Cost</SlideoverTitle>
          </SlideoverHeader>
          <div className="p-4">
            {isEditLoading || !editData ? (
              <div className="py-8 text-sm text-muted-foreground">
                Loading direct cost...
              </div>
            ) : (
              <DirectCostForm
                mode="edit"
                initialData={editData}
                projectId={Number(resolvedParams.projectId)}
                onCancel={() => setIsEditOpen(false)}
                onSuccess={() => {
                  setIsEditOpen(false);
                  router.refresh();
                  // Re-fetch to update the detail view
                  const fetchUpdated = async () => {
                    const response = await fetch(
                      `/api/projects/${resolvedParams.projectId}/direct-costs/${resolvedParams.costId}`,
                    );
                    if (response.ok) {
                      setDirectCost(await response.json());
                    }
                  };
                  fetchUpdated();
                }}
              />
            )}
          </div>
        </SlideoverContent>
      </Slideover>
    </>
  );
}
