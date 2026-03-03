"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/design-system/REFERENCE_COMPONENTS";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  FileText,
} from "lucide-react";

export function FeedbackSection() {
  return (
    <section id="feedback" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Feedback
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        Alerts, loading states, empty states, and toasts for user feedback.
      </p>

      {/* Alerts */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Alert
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

      {/* Skeleton Loader */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Skeleton Loader
        </h3>
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
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

      {/* Spinner */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Spinner
        </h3>
        <div className="flex items-center gap-6 rounded-lg border border-border bg-card p-6">
          <div className="space-y-1 text-center">
            <Spinner className="size-4" />
            <p className="text-xs text-muted-foreground">size-4</p>
          </div>
          <div className="space-y-1 text-center">
            <Spinner className="size-6" />
            <p className="text-xs text-muted-foreground">size-6</p>
          </div>
          <div className="space-y-1 text-center">
            <Spinner className="size-8" />
            <p className="text-xs text-muted-foreground">size-8</p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      <div className="mb-8">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Empty State
        </h3>
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            title="No contracts yet"
            description="Create your first prime contract to start tracking committed costs."
            action={{
              label: "Create Contract",
              onClick: () =>
                toast.info("This is a demo — no contract created"),
            }}
          />
        </div>
      </div>

      {/* Toast Demos */}
      <div>
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary">
          Toast Notifications
        </h3>
        <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-card p-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Item created successfully")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Success Toast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.error("Failed to save changes")}
          >
            <AlertCircle className="h-4 w-4" />
            Error Toast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.warning("Unsaved changes will be lost")}
          >
            <AlertTriangle className="h-4 w-4" />
            Warning Toast
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("New version available")}
          >
            <Info className="h-4 w-4" />
            Info Toast
          </Button>
        </div>
      </div>
    </section>
  );
}
