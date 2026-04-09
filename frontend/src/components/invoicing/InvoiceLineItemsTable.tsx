import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ds/text";
import {
  formatCurrency,
  type OwnerInvoiceLineItem,
} from "@/features/invoicing/invoicing-table-config";

interface InvoiceLineItemsTableProps {
  lineItems: OwnerInvoiceLineItem[];
  showRetention?: boolean;
  /** Retention percentage as a number (e.g. 5 = 5%). Defaults to 0. */
  retentionPercent?: number;
}

/**
 * Invoice Line Items Table Component
 *
 * Displays a table of invoice line items with columns for
 * description, category, and amounts.
 *
 * @example
 * <InvoiceLineItemsTable
 *   lineItems={invoice.owner_invoice_line_items}
 *   showRetention={true}
 *   retentionPercent={invoice.contract_retention_percentage ?? 0}
 * />
 */
export function InvoiceLineItemsTable({
  lineItems,
  showRetention = false,
  retentionPercent = 0,
}: InvoiceLineItemsTableProps) {
  if (!lineItems || lineItems.length === 0) {
    return (
      <div className="text-center py-8">
        <Text tone="muted">No line items found</Text>
      </div>
    );
  }

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.approved_amount || 0),
    0,
  );
  const retentionRate = retentionPercent / 100;
  const retention = subtotal * retentionRate;
  const total = subtotal - retention;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.description || "—"}</TableCell>
              <TableCell>
                <span className="capitalize">
                  {item.category?.replace(/_/g, " ") || "—"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.approved_amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Totals Section */}
      {showRetention && (
        <div className="space-y-2 pt-4 border-t">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">
              Retention ({retentionPercent.toFixed(0)}%)
            </span>
            <span className="font-medium text-destructive">
              -{formatCurrency(retention)}
            </span>
          </div>
          <div className="flex justify-between items-center text-base font-semibold pt-2 border-t">
            <span>Total Due</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
