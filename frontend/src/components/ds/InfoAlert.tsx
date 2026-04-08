import * as React from "react";
import { Info } from "lucide-react";
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
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800/30",
  success: "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800/30",
  error:   "bg-destructive/5 text-destructive border-destructive/20",
};

const defaultIcons: Record<InfoAlertVariant, React.ReactNode> = {
  info:    <Info className="h-4 w-4 shrink-0 mt-px" />,
  warning: <Info className="h-4 w-4 shrink-0 mt-px" />,
  success: <Info className="h-4 w-4 shrink-0 mt-px" />,
  error:   <Info className="h-4 w-4 shrink-0 mt-px" />,
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
