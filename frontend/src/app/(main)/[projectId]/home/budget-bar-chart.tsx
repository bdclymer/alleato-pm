"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BudgetTooltipPayload = Array<{
  name?: string;
  value?: number | null;
}>;

interface BudgetBarChartProps {
  budget: number;
  costToDate: number;
  ecac: number;
}

function fmtCompact(value: number | null | undefined): string {
  if (value == null) return "-";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function fmtFull(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: BudgetTooltipPayload;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-foreground">{payload[0]?.name}</p>
      <p className="text-muted-foreground">{fmtFull(payload[0]?.value)}</p>
    </div>
  );
}

export function BudgetBarChart({ budget, costToDate, ecac }: BudgetBarChartProps) {
  const data = [
    { name: "Revised Budget", value: budget, color: "hsl(var(--muted-foreground) / 0.5)" },
    { name: "Cost to Date", value: costToDate, color: "hsl(var(--primary))" },
    { name: "ECAC", value: ecac, color: ecac > budget ? "hsl(var(--destructive))" : "hsl(var(--status-success))" },
  ];

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={(v) => fmtCompact(Number(v))}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          width={80}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
