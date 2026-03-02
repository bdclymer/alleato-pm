"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SUBMITTALS_PROJECT_ID,
  fetchSubmittalsPreferences,
  getDefaultPreferences,
  persistSubmittalsPreferences,
  type SubmittalsPreferences,
} from "../preferences";

const LOCAL_STORAGE_KEY = "submittals_numbering_prefix";

export default function SubmittalsSettingsGeneralPage() {
  return <GeneralSettingsForm projectId={DEFAULT_SUBMITTALS_PROJECT_ID} />;
}

function GeneralSettingsForm({ projectId }: { projectId: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [preferences, setPreferences] = useState<SubmittalsPreferences>(
    getDefaultPreferences(),
  );
  const [rawPreferences, setRawPreferences] = useState<Record<string, unknown>>(
    {},
  );
  const [rowId, setRowId] = useState<string | undefined>();
  const [userId, setUserId] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("SUB");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      const storedPrefix =
        typeof window !== "undefined"
          ? localStorage.getItem(LOCAL_STORAGE_KEY)
          : null;
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setLoading(false);
        setStatusMessage("Sign in required to load settings.");
        if (storedPrefix) {
          setPrefix(storedPrefix);
        }
        return;
      }

      setUserId(data.user.id);

      const { preferences, rawPreferences, rowId } =
        await fetchSubmittalsPreferences(supabase, data.user.id, projectId);

      setPreferences(preferences);
      setRawPreferences(rawPreferences);
      setRowId(rowId);
      setPrefix(preferences.numberingPrefix ?? storedPrefix ?? "SUB");
      setLoading(false);
    };

    void hydrate();
  }, [projectId, supabase]);

  const handleSave = async () => {
    if (!userId) {
      setStatusMessage("Sign in required to save settings.");
      return;
    }

    if (!prefix.trim()) {
      setStatusMessage("Numbering prefix is required.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    const updated: SubmittalsPreferences = {
      ...preferences,
      numberingPrefix: prefix.trim(),
    };

    try {
      const savedRowId = await persistSubmittalsPreferences(
        supabase,
        userId,
        projectId,
        updated,
        rawPreferences,
        rowId,
      );

      setPreferences(updated);
      setRowId(savedRowId);
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, updated.numberingPrefix ?? "SUB");
      }
      setStatusMessage("Settings saved");
      toast.success("Settings saved");
    } catch (err) {
      setStatusMessage("Unable to save settings. Please try again.");
      toast.error("Failed to save Submittals settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Submittals Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure numbering and workflow defaults.
        </p>
        <p className="text-xs text-muted-foreground">Project ID {projectId}</p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label htmlFor="numbering" className="text-sm font-medium">
            Numbering Prefix
          </Label>
          <Input
            id="numbering"
            data-testid="submittals-numbering-prefix"
            placeholder="SUB"
            value={prefix}
            disabled={loading}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
          />
          <p className="text-xs text-muted-foreground">
            Prefix applied to new submittal numbers (e.g., SUB-0001). Saved per
            user and project.
          </p>
          <div className="flex items-center gap-4">
            <Button
              data-testid="submittals-settings-save"
              onClick={handleSave}
              disabled={saving || loading}
            >
              Save
            </Button>
            {statusMessage ? (
              <span className="text-sm text-muted-foreground" data-testid="submittals-settings-status">
                {statusMessage}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
