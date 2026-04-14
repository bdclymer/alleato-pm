"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ds";
import { toast } from "sonner";

interface BudgetSettingsPanelProps {
  projectId: string;
}

interface BudgetSettings {
  redNegativeValues: boolean;
  autocalculateForecastToComplete: boolean;
  enableAdvancedForecasting: boolean;
  allowModifyingGrandTotal: boolean;
}

const DEFAULTS: BudgetSettings = {
  redNegativeValues: true,
  autocalculateForecastToComplete: true,
  enableAdvancedForecasting: true,
  allowModifyingGrandTotal: false,
};

export function BudgetSettingsPanel({ projectId: _projectId }: BudgetSettingsPanelProps) {
  const [settings, setSettings] = useState<BudgetSettings>(DEFAULTS);
  const [saved, setSaved] = useState<BudgetSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  const handleToggle = (key: keyof BudgetSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: persist to project_budget_settings table once schema lands
      await new Promise((r) => setTimeout(r, 300));
      setSaved(settings);
      toast.success("Budget settings saved");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => setSettings(saved);

  return (
    <div className="max-w-3xl space-y-8">
      <SettingGroup title="Budget Line Formatting">
        <SettingRow
          label="Display all values in red text on rows where any calculated column value is negative"
          checked={settings.redNegativeValues}
          onChange={() => handleToggle("redNegativeValues")}
        />
      </SettingGroup>

      <SettingGroup title="Forecasting">
        <SettingRow
          label="Autocalculate Forecast to Complete by default"
          checked={settings.autocalculateForecastToComplete}
          onChange={() => handleToggle("autocalculateForecastToComplete")}
        />
        <SettingRow
          label="Enable Advanced Forecasting"
          checked={settings.enableAdvancedForecasting}
          onChange={() => handleToggle("enableAdvancedForecasting")}
        />
      </SettingGroup>

      <SettingGroup title="Budget Modifications">
        <SettingRow
          label="Allow Budget Modifications Which Modify Grand Total"
          checked={settings.allowModifyingGrandTotal}
          onChange={() => handleToggle("allowModifyingGrandTotal")}
        />
      </SettingGroup>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-6">
        <Button variant="outline" onClick={handleCancel} disabled={!isDirty || saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isDirty || saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <SectionHeader title={title} />
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <Label htmlFor={id} className="text-sm font-normal leading-relaxed cursor-pointer">
        {label}
      </Label>
    </div>
  );
}
