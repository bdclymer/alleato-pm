"use client";

import {
  Badge,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  StatusDot,
  StatusBadge,
  Avatar,
  AvatarFallback,
} from "@/components/ds";

export function DataDisplaySection() {
  return (
    <section id="data-display" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          06
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Data Display
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Tables, badges, avatars, status indicators, and progress. Tables use
            10px uppercase headers, horizontal-only dividers, and status dots.
          </p>
        </div>
      </div>

      {/* Table — Compare Wrong vs Right */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Data Table
        </h3>
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {/* Wrong */}
          <div className="bg-card p-6">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-600 bg-red-50 px-2 py-0.5 rounded mb-5">
              ✗ Wrong
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="bg-muted px-4 py-3 text-left text-[13px] font-bold text-foreground border border-border">
                      Project
                    </th>
                    <th className="bg-muted px-4 py-3 text-left text-[13px] font-bold text-foreground border border-border">
                      Status
                    </th>
                    <th className="bg-muted px-4 py-3 text-right text-[13px] font-bold text-foreground border border-border">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Westfield Collective
                    </td>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Active
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground border border-border">
                      $142,800
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Harbor View Towers
                    </td>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Pending
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground border border-border">
                      $89,200
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Pine Street Renovation
                    </td>
                    <td className="px-4 py-3 text-muted-foreground border border-border">
                      Active
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground border border-border">
                      $234,500
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
              Bold 13px headers same weight as data. Full grid borders. Status
              as plain text. All cells same color — no hierarchy.
            </p>
          </div>

          {/* Right */}
          <div className="bg-card p-6">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-green-600 bg-green-50 px-2 py-0.5 rounded mb-5">
              ✓ Right
            </div>
            <div className="overflow-hidden rounded-lg">
              <table className="w-full text-[13px]">
                <thead>
                  <tr>
                    <th className="px-4 pb-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b border-border whitespace-nowrap">
                      Project
                    </th>
                    <th className="px-4 pb-2.5 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b border-border whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 pb-2.5 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b border-border whitespace-nowrap">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      name: "Westfield Collective",
                      status: "Active",
                      statusColor: "bg-green-500",
                      amount: "$142,800",
                    },
                    {
                      name: "Harbor View Towers",
                      status: "Pending",
                      statusColor: "bg-yellow-500",
                      amount: "$89,200",
                    },
                    {
                      name: "Pine Street Renovation",
                      status: "Active",
                      statusColor: "bg-green-500",
                      amount: "$234,500",
                    },
                  ].map((row, i, arr) => (
                    <tr
                      key={row.name}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <td
                        className={`px-4 py-2.5 font-medium text-foreground ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                      >
                        {row.name}
                      </td>
                      <td
                        className={`px-4 py-2.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${row.statusColor}`}
                          />
                          {row.status}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono text-muted-foreground tabular-nums ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                      >
                        {row.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground leading-relaxed">
              10px uppercase headers. Horizontal-only dividers. First column
              bolder. Status dots, not text badges. Monospace for numbers. Row
              hover.
            </p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Badge Variants
        </h3>
        <div className="flex flex-wrap gap-2 rounded-xl bg-card p-6 shadow-sm">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="active">Active</Badge>
          <Badge variant="inactive">Inactive</Badge>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Status Indicators
        </h3>
        <div className="grid gap-px rounded-xl overflow-hidden bg-border shadow-sm sm:grid-cols-2">
          <div className="bg-card p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
              Status Dot (inline, for tables)
            </p>
            <div className="space-y-2">
              <StatusDot status="Active" />
              <StatusDot status="Pending" />
              <StatusDot status="Overdue" />
              <StatusDot status="Draft" />
              <StatusDot status="Inactive" />
            </div>
          </div>
          <div className="bg-card p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
              Status Badge (emphasized)
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="Approved" />
              <StatusBadge status="In Review" />
              <StatusBadge status="Rejected" />
              <StatusBadge status="Draft" />
              <StatusBadge status="Archived" />
            </div>
          </div>
        </div>
      </div>

      {/* Avatars */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Avatars
        </h3>
        <div className="flex items-end gap-6 rounded-xl bg-card p-6 shadow-sm">
          {[
            ["h-8 w-8", "BC", "sm"],
            ["h-10 w-10", "MH", "md"],
            ["h-12 w-12", "JD", "lg"],
          ].map(([size, initials, label]) => (
            <div key={label} className="text-center">
              <Avatar className={size}>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 font-mono">
                {label}
              </p>
            </div>
          ))}
          <div className="ml-4 flex -space-x-2">
            {["BC", "MH", "JD"].map((initials) => (
              <Avatar
                key={initials}
                className="h-8 w-8 border-2 border-background"
              >
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            ))}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
              +5
            </div>
          </div>
        </div>
      </div>

      {/* Progress + Tooltip */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
            Progress
          </h3>
          <div className="space-y-4 rounded-xl bg-card p-6 shadow-sm">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
                  Budget Used
                </p>
                <p className="text-xs font-mono text-muted-foreground">25%</p>
              </div>
              <Progress value={25} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
                  Schedule Progress
                </p>
                <p className="text-xs font-mono text-muted-foreground">75%</p>
              </div>
              <Progress value={75} />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
            Tooltip
          </h3>
          <div className="rounded-xl bg-card p-6 shadow-sm">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help border-b border-dashed border-border text-sm text-foreground">
                    Hover me for details
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This is a tooltip with additional context</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </section>
  );
}
