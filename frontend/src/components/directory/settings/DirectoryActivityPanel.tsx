"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectoryActivityEntry } from "@/services/directoryAdminService";
import { toast } from "@/hooks/use-toast";

interface DirectoryActivityPanelProps {
  projectId: string;
}

export function DirectoryActivityPanel({
  projectId,
}: DirectoryActivityPanelProps) {
  const [entries, setEntries] = React.useState<DirectoryActivityEntry[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadActivity = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/directory/activity?limit=50`,
      );
      if (!response.ok) {
        throw new Error("Failed to load activity log");
      }
      const payload = await response.json();
      setEntries(payload.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load activity log",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={loadActivity}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-md border p-4 text-sm space-y-1"
          >
            <div className="font-medium">{entry.action}</div>
            <div className="text-muted-foreground">
              {entry.action_description || "No description"}
            </div>
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Person: {entry.person_id}</span>
              <span>
                {new Date(entry.performed_at).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
