import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type InvoiceStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "approved_as_noted"
  | "revise_and_resubmit"
  | "paid"
  | "void"
  | "not_invited"
  | "invited";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "warning" | "outline" }> = {
  draft:                { label: "Draft",                variant: "secondary" },
  under_review:         { label: "Under Review",         variant: "default" },
  approved:             { label: "Approved",             variant: "success" },
  approved_as_noted:    { label: "Approved as Noted",    variant: "success" },
  revise_and_resubmit:  { label: "Revise and Resubmit",  variant: "destructive" },
  paid:                 { label: "Paid",                 variant: "success" },
  void:                 { label: "Void",                 variant: "outline" },
  not_invited:          { label: "Not Invited",          variant: "secondary" },
  invited:              { label: "Invited",              variant: "default" },
};

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = STATUS_CONFIG[status as InvoiceStatus] ?? { label: status, variant: "secondary" as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
