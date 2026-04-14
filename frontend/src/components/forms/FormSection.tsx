import * as React from "react";
import { cn } from "@/lib/utils";

type FormSectionSpacing = "default" | "compact";

const spacingStyles: Record<FormSectionSpacing, { section: string; divider: string; noDivider: string }> = {
  default: {
    section:   "space-y-6 pb-8",
    divider:   "border-t border-border/70 pt-8 first:border-t-0 first:pt-0",
    noDivider: "pt-8 first:pt-0",
  },
  compact: {
    section:   "space-y-4 pb-6",
    divider:   "border-t border-border/70 pt-6 first:border-t-0 first:pt-0",
    noDivider: "pt-6 first:pt-0",
  },
};

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  showDivider?: boolean;
  spacing?: FormSectionSpacing;
}

export function FormSection({
  title,
  description,
  children,
  actions,
  className,
  showDivider = true,
  spacing = "default",
}: FormSectionProps) {
  const s = spacingStyles[spacing];
  return (
    <section
      className={cn(
        s.section,
        showDivider ? s.divider : s.noDivider,
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-0.5">
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
