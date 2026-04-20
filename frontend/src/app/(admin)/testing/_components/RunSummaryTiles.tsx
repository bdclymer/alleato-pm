import { cn } from "@/lib/utils";

// Borderless, tonal summary tiles for the "run complete" state. Replaces
// the old hardcoded bg-green-50 / bg-red-50 / emoji pattern.
export function RunSummaryTiles({
  pass,
  fail,
  skip,
  total,
}: {
  pass: number;
  fail: number;
  skip: number;
  total: number;
}) {
  const passPct = total > 0 ? Math.round((pass / total) * 100) : 0;
  const items: { label: string; value: number | string; tone: string }[] = [
    { label: "Passed", value: pass, tone: "text-success" },
    { label: "Failed", value: fail, tone: "text-destructive" },
    { label: "Skipped", value: skip, tone: "text-muted-foreground" },
    { label: "Pass rate", value: `${passPct}%`, tone: "text-foreground" },
  ];
  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
          <p className={cn("text-4xl font-semibold tracking-tight", item.tone)}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
