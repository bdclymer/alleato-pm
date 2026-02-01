"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "error" | "loading";
  backend: boolean;
  openai_configured: boolean;
  timestamp: string;
  error?: string;
}

export function BackendStatusIndicator() {
  const [health, setHealth] = useState<HealthStatus>({
    status: "loading",
    backend: false,
    openai_configured: false,
    timestamp: new Date().toISOString(),
  });

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setHealth(data);
      } catch (error) {
        setHealth({
          status: "error",
          backend: false,
          openai_configured: false,
          timestamp: new Date().toISOString(),
          error: "Failed to check backend status",
        });
      }
    };

    // Initial check
    checkHealth();

    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-4 p-2 bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Backend:</span>
        {health.status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : health.backend ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm text-muted-foreground">
          {health.status === "loading"
            ? "Checking..."
            : health.backend
              ? "Connected"
              : "Disconnected"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">OpenAI:</span>
        {health.status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : health.openai_configured ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : health.backend ? (
          <AlertCircle className="h-4 w-4 text-warning" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm text-muted-foreground">
          {health.status === "loading"
            ? "Checking..."
            : !health.backend
              ? "Backend required"
              : health.openai_configured
                ? "Configured"
                : "Not configured"}
        </span>
      </div>

      {health.error && (
        <div className="text-xs text-destructive ml-auto">{health.error}</div>
      )}
    </div>
  );
}
