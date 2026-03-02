"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_SUBMITTALS_PROJECT_ID,
  fetchSubmittalsPreferences,
  persistSubmittalsPreferences,
  type SubmittalWorkflowTemplate,
  type SubmittalsPreferences,
  getDefaultPreferences,
} from "../preferences";

export default function SubmittalWorkflowTemplatesPage() {
  return <WorkflowTemplatesForm projectId={DEFAULT_SUBMITTALS_PROJECT_ID} />;
}

function WorkflowTemplatesForm({ projectId }: { projectId: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [rowId, setRowId] = useState<string | undefined>();
  const [rawPreferences, setRawPreferences] = useState<Record<string, unknown>>(
    {},
  );
  const [templates, setTemplates] = useState<SubmittalWorkflowTemplate[]>(
    getDefaultPreferences().workflowTemplates ?? [],
  );
  const [preferences, setPreferences] = useState<SubmittalsPreferences>(
    getDefaultPreferences(),
  );
  const [defaultTemplateId, setDefaultTemplateId] = useState<string>(
    () => getDefaultPreferences().workflowTemplates?.[0]?.id ?? "",
  );
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateSteps, setNewTemplateSteps] = useState("");
  const [newResponseDays, setNewResponseDays] = useState("7");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setStatusMessage("Sign in required to load workflow templates.");
        setLoading(false);
        return;
      }

      setUserId(data.user.id);

      const { preferences, rawPreferences, rowId } =
        await fetchSubmittalsPreferences(supabase, data.user.id, projectId);

      setPreferences(preferences);
      setTemplates(preferences.workflowTemplates ?? []);
      setDefaultTemplateId(
        preferences.workflowTemplates?.find((t) => t.isDefault)?.id ??
          preferences.workflowTemplates?.[0]?.id ??
          "",
      );
      setRawPreferences(rawPreferences);
      setRowId(rowId);
      setLoading(false);
    };

    void hydrate();
  }, [projectId, supabase]);

  const handleAddTemplate = () => {
    if (!newTemplateName.trim()) {
      setStatusMessage("Template name is required.");
      return;
    }

    const steps = newTemplateSteps
      .split(/[\n,]/)
      .map((step) => step.trim())
      .filter(Boolean);

    const template: SubmittalWorkflowTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      steps: steps.length ? steps : ["Submitter", "Reviewer"],
      responseDays: Number.parseInt(newResponseDays, 10) || 7,
    };

    setTemplates((prev) => [...prev, template]);
    setNewTemplateName("");
    setNewTemplateSteps("");
    setNewResponseDays("7");
    setStatusMessage(null);
  };

  const handleSave = async () => {
    if (!userId) {
      setStatusMessage("Sign in required to save templates.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    const updatedTemplates = templates.map((template) => ({
      ...template,
      isDefault: template.id === defaultTemplateId,
    }));

    try {
      const updatedPrefs: SubmittalsPreferences = {
        ...preferences,
        workflowTemplates: updatedTemplates,
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
      setStatusMessage("Workflow templates saved");
      toast.success("Workflow templates saved");
    } catch (err) {
      setStatusMessage("Unable to save templates.");
      toast.error("Failed to save templates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Workflow Templates</h1>
        <p className="text-muted-foreground">
          Configure step-by-step review paths for Submittals.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Existing Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No templates defined yet.
            </p>
          )}
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">
                  Steps: {template.steps.join(" → ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Response goal: {template.responseDays ?? 0} days
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">
                  Default
                </Label>
                <input
                  type="radio"
                  name="default-template"
                  checked={defaultTemplateId === template.id}
                  onChange={() => setDefaultTemplateId(template.id)}
                  className="h-4 w-4"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Add Template</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="Structural Review"
              value={newTemplateName}
              disabled={loading}
              onChange={(e) => setNewTemplateName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="response-days">Response Days</Label>
            <Input
              id="response-days"
              type="number"
              min="1"
              value={newResponseDays}
              disabled={loading}
              onChange={(e) => setNewResponseDays(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="template-steps">Steps (comma or newline separated)</Label>
            <Textarea
              id="template-steps"
              placeholder="Submitter, Architect, Owner"
              value={newTemplateSteps}
              disabled={loading}
              onChange={(e) => setNewTemplateSteps(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-4">
            <Button onClick={handleAddTemplate} disabled={loading}>
              Add Template
            </Button>
            {statusMessage ? (
              <span className="text-sm text-muted-foreground">{statusMessage}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving || loading}>
          Save Templates
        </Button>
        {statusMessage ? (
          <span className="text-sm text-muted-foreground">{statusMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
