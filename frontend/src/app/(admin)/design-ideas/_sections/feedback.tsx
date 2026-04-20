"use client";

import { Alert, AlertDescription, AlertTitle, Skeleton, Button, Spinner, EmptyState } from "@/components/ds";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  FileText,
  Plus,
} from "lucide-react";

export function FeedbackSection() {
  return (
    <section id="feedback" className="scroll-mt-8">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
        <span className="font-mono text-[11px] font-medium text-muted-foreground/40 w-6 shrink-0">
          07
        </span>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Feedback & States
          </h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Alerts, loading skeletons, spinners, empty states, and toast
            notifications. Never just &quot;No data.&quot; — always icon + title
            + explanation + action.
          </p>
        </div>
      </div>

      {/* Empty State — Compare Wrong vs Right */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Empty State
        </h3>
        <div className="grid grid-cols-2 gap-px rounded-xl overflow-hidden bg-border shadow-sm">
          {/* Wrong */}
          <div className="bg-card p-8 flex flex-col items-center justify-center min-h-[200px]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-red-600 bg-red-50 px-2 py-0.5 rounded mb-6">
              ✗ Wrong
            </div>
            <p className="text-sm text-muted-foreground">
              No data available.
            </p>
          </div>

          {/* Right */}
          <div className="bg-card p-8 flex flex-col items-center justify-center min-h-[200px]">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-green-600 bg-green-50 px-2 py-0.5 rounded mb-6">
              ✓ Right
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No contracts yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground max-w-[280px]">
                Create your first prime contract to start tracking committed
                costs and change orders.
              </p>
              <Button size="sm" className="mt-4">
                Create Contract
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Empty State Component */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          EmptyState Component
        </h3>
        <div className="rounded-xl bg-card shadow-sm">
          <EmptyState
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="No contracts yet"
            description="Create your first prime contract to start tracking committed costs."
            action={
              <Button size="sm" variant="outline" onClick={() => toast.info("This is a demo — no contract created")}>
                <Plus />
                Create Contract
              </Button>
            }
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="mb-10">
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Alerts
        </h3>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              This is a default informational alert with a description.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Something went wrong. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Skeleton + Spinner */}
      <div className="grid gap-6 sm:grid-cols-2 mb-10">
        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
            Skeleton Loader
          </h3>
          <div className="space-y-4 rounded-xl bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
            Spinner
          </h3>
          <div className="flex items-center gap-8 rounded-xl bg-card p-6 shadow-sm">
            {[
              ["size-4", "16px"],
              ["size-6", "24px"],
              ["size-8", "32px"],
            ].map(([cls, label]) => (
              <div key={cls} className="text-center">
                <Spinner className={cls} />
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 font-mono">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Demos */}
      <div>
        <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60">
          Toast Notifications
        </h3>
        <div className="flex flex-wrap gap-3 rounded-xl bg-card p-6 shadow-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Item created successfully")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Success
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.error("Failed to save changes")}
          >
            <AlertCircle />
            Error
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.warning("Unsaved changes will be lost")}
          >
            <AlertTriangle />
            Warning
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("New version available")}
          >
            <Info />
            Info
          </Button>
        </div>
      </div>
    </section>
  );
}
