import * as React from "react";
import { CheckCircle2, Info, TriangleAlert, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type InfoAlertVariant = "info" | "warning" | "success" | "error";

interface InfoAlertProps {
  children: React.ReactNode;
  variant?: InfoAlertVariant;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<InfoAlertVariant, string> = {
  info:    "bg-primary/5 text-primary border-primary/20",
  warning: "bg-warning/10 text-warning border-warning/30",
  success: "bg-success/10 text-success border-success/30",
  error:   "bg-destructive/5 text-destructive border-destructive/20",
};

const defaultIcons: Record<InfoAlertVariant, React.ReactNode> = {
  info:    <Info className="h-4 w-4 shrink-0 mt-px" />,
  warning: <TriangleAlert className="h-4 w-4 shrink-0 mt-px" />,
  success: <CheckCircle2 className="h-4 w-4 shrink-0 mt-px" />,
  error:   <AlertCircle className="h-4 w-4 shrink-0 mt-px" />,
};

export function InfoAlert({ children, variant = "info", icon, className }: InfoAlertProps) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm",
        variantStyles[variant],
        className,
      )}
    >
      {icon ?? defaultIcons[variant]}
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
