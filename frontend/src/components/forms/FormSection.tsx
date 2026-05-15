import * as React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** @deprecated — use a gap wrapper around sections instead */
  showDivider?: boolean;
  /** @deprecated — use a gap wrapper around sections instead */
  spacing?: "default" | "compact";
}

export function FormSection({
  title,
  description,
  children,
  actions,
  className,
}: FormSectionProps) {
  return (
    <section className={cn("space-y-4 pb-4 last:pb-0", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
          {/* eslint-disable-next-line design-system/no-raw-heading */}
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}
