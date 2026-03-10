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
    <section className="space-y-6 bg-background pb-14 border-gray-300 border-b">
      <div className="flex items-start justify-between gap-4 pb-2">
        <div>
          <h2 className="text-lg text-primary uppercase tracking-wider font-medium">{title}</h2>
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