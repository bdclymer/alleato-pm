"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  StatusDot,
  StatusBadge,
} from "@/design-system/REFERENCE_COMPONENTS";

const sampleData = [
  { name: "Westfield Collective", status: "Active", amount: "$142,800" },
  { name: "Harbor View Towers", status: "Pending", amount: "$89,200" },
  { name: "Pine Street Renovation", status: "Active", amount: "$234,500" },
];

export function DataDisplaySection() {
  return (
    <section id="data-display" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Data Display
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Components for displaying data: badges, avatars, tables, cards,
        tooltips, and progress indicators.
      </p>

      {/* Badges */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Badge Variants
        </h3>
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-6">
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="active">Active</Badge>
          <Badge variant="inactive">Inactive</Badge>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Status Indicators
        </h3>
        <div className="grid gap-6 rounded-lg border border-border bg-card p-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Status Dot (inline, for tables)
            </p>
            <div className="space-y-2">
              <StatusDot variant="success" label="Active" />
              <br />
              <StatusDot variant="warning" label="Pending Review" />
              <br />
              <StatusDot variant="error" label="Overdue" />
              <br />
              <StatusDot variant="info" label="Draft" />
              <br />
              <StatusDot variant="neutral" label="Inactive" />
            </div>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">
              Status Badge (emphasized)
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="success" label="Approved" />
              <StatusBadge variant="warning" label="Under Review" />
              <StatusBadge variant="error" label="Rejected" />
              <StatusBadge variant="info" label="Draft" />
              <StatusBadge variant="neutral" label="Archived" />
            </div>
          </div>
        </div>
      </div>

      {/* Avatars */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Avatars
        </h3>
        <div className="flex items-end gap-6 rounded-lg border border-border bg-card p-6">
          <div className="space-y-1 text-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback>BC</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">sm</p>
          </div>
          <div className="space-y-1 text-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback>MH</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">md</p>
          </div>
          <div className="space-y-1 text-center">
            <Avatar className="h-12 w-12">
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">lg</p>
          </div>
          <div className="ml-4 flex -space-x-2">
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback>BC</AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback>MH</AvatarFallback>
            </Avatar>
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium text-muted-foreground">
              +5
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Table
        </h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Contract Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sampleData.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "Active" ? "active" : "secondary"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.amount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Card + Tooltip + Progress */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
            Card
          </h3>
          <Card>
            <CardHeader>
              <CardTitle>Project Summary</CardTitle>
              <CardDescription>Overview of project metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards are used sparingly — only for KPI tiles and summary
                blocks. Never wrap sections in cards.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
              Tooltip
            </h3>
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

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
              Progress
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">25% Complete</p>
                <Progress value={25} />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">75% Complete</p>
                <Progress value={75} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
