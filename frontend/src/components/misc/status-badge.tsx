import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType =
  | "commitment"
  | "change-event"
  | "change-order"
  | "prime-contract"
  | "invoice"
  | "direct-cost";

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "success" | "warning" | "destructive";
  className?: string;
}

const statusConfigs: Record<StatusType, Record<string, StatusConfig>> = {
  commitment: {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    executed: {
      label: "Executed",
      variant: "success",
      className: "bg-green-500",
    },
    closed: { label: "Closed", variant: "default" },
    void: { label: "Void", variant: "destructive" },
  },
  "change-event": {
    open: { label: "Open", variant: "default" },
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    closed: { label: "Closed", variant: "secondary" },
  },
  "change-order": {
    draft: { label: "Draft", variant: "secondary" },
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    executed: {
      label: "Executed",
      variant: "success",
      className: "bg-green-500",
    },
    void: { label: "Void", variant: "destructive" },
  },
  "prime-contract": {
    draft: { label: "Draft", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    executed: {
      label: "Executed",
      variant: "success",
      className: "bg-green-500",
    },
    closed: { label: "Closed", variant: "default" },
  },
  invoice: {
    draft: { label: "Draft", variant: "secondary" },
    submitted: { label: "Submitted", variant: "default" },
    approved: { label: "Approved", variant: "success" },
    paid: { label: "Paid", variant: "success", className: "bg-green-500" },
    void: { label: "Void", variant: "destructive" },
  },
  "direct-cost": {
    draft: { label: "Draft", variant: "secondary" },
    pending_approval: { label: "Pending Approval", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    paid: { label: "Paid", variant: "success", className: "bg-green-500" },
    void: { label: "Void", variant: "destructive" },
  },
};

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const config = statusConfigs[type]?.[status];

  if (!config) {
    return (
      <Badge variant="secondary" className={className}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
