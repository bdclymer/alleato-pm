"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportErrorObject } from "@/lib/app-error-reporter";

interface RouteErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteErrorPage({ error, reset }: RouteErrorPageProps) {
  useEffect(() => {
    console.error(error);
    reportErrorObject(error, {
      severity: "high",
      action: "route_error_boundary",
      route: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="flex min-h-96 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <div className="space-y-2">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Go back
        </Button>
        <Button size="sm" onClick={reset}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      </div>
    </div>
  );
}
