import * as React from "react";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  actions,
}: FormSectionProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4 border-b pb-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
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