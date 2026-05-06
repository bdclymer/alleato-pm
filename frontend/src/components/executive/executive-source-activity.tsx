import { CalendarDays, FileText, Mail, MessageSquare } from "lucide-react";
import { SectionRuleHeading } from "@/components/layout";
import type { BrandonBriefSourceCoverage } from "@/lib/executive/brandon-daily-update";

const sourceIcons = {
  Email: Mail,
  Teams: MessageSquare,
  Meeting: CalendarDays,
  Document: FileText,
} satisfies Record<
  BrandonBriefSourceCoverage["label"],
  React.ComponentType<{ className?: string }>
>;

export function ExecutiveSourceActivity({
  sources,
}: {
  sources: BrandonBriefSourceCoverage[];
}) {
  return (
    <section className="space-y-4">
      <SectionRuleHeading label="Source Health" />

      <div className="divide-y divide-border">
        {sources.map((source) => {
          const Icon = sourceIcons[source.label];

          return (
            <div key={source.label} className="flex items-center gap-3 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  {source.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  Latest {source.latest}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-foreground">
                {source.count}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
