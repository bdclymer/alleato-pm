import Link from "next/link";
import { TableLayout } from "@/components/layouts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  draft: "outline",
  executed: "default",
  rejected: "destructive",
  void: "destructive",
};

function formatCurrency(amount: number | null): string {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ChangeOrderDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; changeOrderId: string }>;
}) {
  const { projectId, changeOrderId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  const { data: changeOrder, error } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", numericProjectId)
    .eq("id", Number(changeOrderId))
    .single();

  if (error || !changeOrder) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Change order not found. Please return to the list and try again.
        </div>
      </TableLayout>
    );
  }

  // Fetch linked contract name if exists
  let contractNumber: string | null = null;
  if (changeOrder.contract_id) {
    const { data: contract } = await supabase
      .from("contracts")
      .select("contract_number")
      .eq("id", changeOrder.contract_id)
      .single();
    contractNumber = contract?.contract_number ?? null;
  }

  const statusVariant = STATUS_VARIANTS[changeOrder.status ?? ""] ?? "outline";

  return (
    <TableLayout>
      <div className="flex items-center justify-between mb-6">
        <Button asChild variant="ghost">
          <Link href={`/${projectId}/change-orders`}>
            Back to Change Orders
          </Link>
        </Button>
        <Badge variant={statusVariant} className="text-sm">
          {changeOrder.status || "Unknown"}
        </Badge>
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {changeOrder.co_number && (
              <span className="text-muted-foreground mr-2">
                {changeOrder.co_number}
              </span>
            )}
            {changeOrder.title || "Untitled Change Order"}
          </h1>
          {changeOrder.description && (
            <p className="text-muted-foreground mt-2">
              {changeOrder.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="text-sm font-medium">
                  {formatCurrency(changeOrder.amount)}
                </span>
              </div>
              {contractNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Contract
                  </span>
                  <span className="text-sm">{contractNumber}</span>
                </div>
              )}
              {changeOrder.is_private && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Visibility
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Private
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">
                  {formatDate(changeOrder.created_at)}
                </span>
              </div>
              {changeOrder.due_date && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Due Date
                  </span>
                  <span className="text-sm">
                    {formatDate(changeOrder.due_date)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Submitted
                </span>
                <span className="text-sm">
                  {formatDate(changeOrder.submitted_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="text-sm">
                  {formatDate(changeOrder.approved_at)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {changeOrder.rejection_reason && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-base text-destructive">
                Rejection Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{changeOrder.rejection_reason}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </TableLayout>
  );
}
