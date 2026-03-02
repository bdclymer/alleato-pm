"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SUBMITTALS_PROJECT_ID,
  fetchSubmittalsPreferences,
  persistSubmittalsPreferences,
  type SubmittalCustomField,
  type SubmittalsPreferences,
  getDefaultPreferences,
} from "../preferences";

export default function SubmittalCustomFieldsPage() {
  return <CustomFieldsForm projectId={DEFAULT_SUBMITTALS_PROJECT_ID} />;
}

function CustomFieldsForm({ projectId }: { projectId: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | undefined>();
  const [rawPreferences, setRawPreferences] = useState<Record<string, unknown>>(
    {},
  );
  const [preferences, setPreferences] = useState<SubmittalsPreferences>(
    getDefaultPreferences(),
  );
  const [fields, setFields] = useState<SubmittalCustomField[]>(
    getDefaultPreferences().customFields ?? [],
  );
  const [newField, setNewField] = useState<SubmittalCustomField>({
    id: "",
    label: "",
    type: "text",
    required: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setStatusMessage("Sign in required to load custom fields.");
        setLoading(false);
        return;
      }

      setUserId(data.user.id);

      const { preferences, rawPreferences, rowId } =
        await fetchSubmittalsPreferences(supabase, data.user.id, projectId);

      setPreferences(preferences);
      setFields(preferences.customFields ?? []);
      setRawPreferences(rawPreferences);
      setRowId(rowId);
      setLoading(false);
    };

    void hydrate();
  }, [projectId, supabase]);

  const handleAddField = () => {
    if (!newField.label.trim()) {
      setStatusMessage("Field label is required.");
      return;
    }

    const field: SubmittalCustomField = {
      ...newField,
      id: newField.id || `field-${Date.now()}`,
      label: newField.label.trim(),
    };

    setFields((prev) => [...prev, field]);
    setNewField({ id: "", label: "", type: "text", required: false });
    setStatusMessage(null);
  };

  const updateField = (
    id: string,
    updater: (field: SubmittalCustomField) => SubmittalCustomField,
  ) => {
    setFields((prev) => prev.map((field) => (field.id === id ? updater(field) : field)));
  };

  const handleSave = async () => {
    if (!userId) {
      setStatusMessage("Sign in required to save fields.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const updatedPrefs: SubmittalsPreferences = {
        ...preferences,
        customFields: fields,
      };

      const savedRowId = await persistSubmittalsPreferences(
        supabase,
        userId,
        projectId,
        updatedPrefs,
        rawPreferences,
        rowId,
      );

      setPreferences(updatedPrefs);
      setRowId(savedRowId);
      setStatusMessage("Custom fields saved");
      toast.success("Custom fields saved");
    } catch (err) {
      setStatusMessage("Unable to save custom fields.");
      toast.error("Failed to save custom fields");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Custom Fields</h1>
        <p className="text-muted-foreground">
          Manage project-specific data points for Submittals.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Existing Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom fields added.</p>
          )}
          {fields.map((field) => (
            <div
              key={field.id}
              className="grid gap-2 rounded-lg border p-4 md:grid-cols-4 md:items-center"
            >
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  value={field.label}
                  disabled={loading}
                  onChange={(e) =>
                    updateField(field.id, (prev) => ({
                      ...prev,
                      label: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={field.type}
                  onValueChange={(value) =>
                    updateField(field.id, (prev) => ({
                      ...prev,
                      type: value as SubmittalCustomField["type"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={Boolean(field.required)}
                  onCheckedChange={(checked) =>
                    updateField(field.id, (prev) => ({
                      ...prev,
                      required: checked,
                    }))
                  }
                />
                <span className="text-sm">Required</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add Field</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 md:items-center">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="field-label">Field Label</Label>
            <Input
              id="field-label"
              placeholder="Specification Section"
              value={newField.label}
              disabled={loading}
              onChange={(e) =>
                setNewField((prev) => ({
                  ...prev,
                  label: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="field-type">Field Type</Label>
            <Select
              value={newField.type}
              onValueChange={(value) =>
                setNewField((prev) => ({
                  ...prev,
                  type: value as SubmittalCustomField["type"],
                }))
              }
            >
              <SelectTrigger id="field-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="select">Select</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6 md:pt-0">
            <Switch
              checked={Boolean(newField.required)}
              onCheckedChange={(checked) =>
                setNewField((prev) => ({
                  ...prev,
                  required: checked,
                }))
              }
            />
            <span className="text-sm">Required</span>
          </div>
          <div className="md:col-span-4 flex items-center gap-4">
            <Button onClick={handleAddField} disabled={loading}>
              Add Field
            </Button>
            {statusMessage ? (
              <span className="text-sm text-muted-foreground">{statusMessage}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          Save Fields
        </Button>
        {statusMessage ? (
          <span className="text-sm text-muted-foreground">{statusMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
