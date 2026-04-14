"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

import { FormSection, ToggleField } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ds/text";
import { ApiError, apiFetch } from "@/lib/api-client";

interface CommitmentAdvancedSettings {
  // Invoicing Settings
  enable_invoices: boolean;
  enable_comments: boolean;
  enable_payments: boolean;
  enable_completed_work_retainage: boolean;
  enable_stored_materials_retainage: boolean;
  show_cost_codes_on_pdf: boolean;
  allow_overbilling: boolean;

  // SOV Settings
  enable_subcontractor_sov: boolean;
  enable_always_editable_sov: boolean;

  // Financial Settings
  enable_financial_markup: boolean;
  show_markup_criteria_on_pdf: boolean;

  // Notification Settings
  send_invoice_approval_notifications: boolean;
  send_payment_notifications: boolean;

  // Default Values
  default_retainage_percent: number;
  billing_period: "weekly" | "biweekly" | "monthly";
}

interface AdvancedSettingsTabProps {
  commitmentId: string;
  commitmentType?: "subcontract" | "purchase_order" | string;
}

const DEFAULT_SETTINGS: CommitmentAdvancedSettings = {
  enable_invoices: true,
  enable_comments: true,
  enable_payments: true,
  enable_completed_work_retainage: false,
  enable_stored_materials_retainage: false,
  show_cost_codes_on_pdf: true,
  allow_overbilling: false,
  enable_subcontractor_sov: true,
  enable_always_editable_sov: false,
  enable_financial_markup: false,
  show_markup_criteria_on_pdf: false,
  send_invoice_approval_notifications: true,
  send_payment_notifications: true,
  default_retainage_percent: 0,
  billing_period: "monthly",
};

export const AdvancedSettingsTab = memo(function AdvancedSettingsTab({
  commitmentId,
  commitmentType = "subcontract",
}: AdvancedSettingsTabProps) {
  const [settings, setSettings] =
    useState<CommitmentAdvancedSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] =
    useState<CommitmentAdvancedSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await apiFetch<
        CommitmentAdvancedSettings | { data?: CommitmentAdvancedSettings }
      >(
        `/api/commitments/${commitmentId}/advanced-settings`
      );
      const loadedSettings =
        ("data" in data ? data.data : data) ?? DEFAULT_SETTINGS;
      const normalizedSettings: CommitmentAdvancedSettings = {
        ...DEFAULT_SETTINGS,
        ...loadedSettings,
      };
      setSettings(normalizedSettings);
      setOriginalSettings(normalizedSettings);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // No settings saved yet, use defaults
        setSettings(DEFAULT_SETTINGS);
        setOriginalSettings(DEFAULT_SETTINGS);
        return;
      }
      console.error("Error loading settings:", error);
      // Use defaults on error
      setSettings(DEFAULT_SETTINGS);
      setOriginalSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [commitmentId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Track changes
  useEffect(() => {
    const changed =
      JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Update a single setting
  const updateSetting = <K extends keyof CommitmentAdvancedSettings>(
    key: K,
    value: CommitmentAdvancedSettings[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);

    try {
      await apiFetch(
        `/api/commitments/${commitmentId}/advanced-settings`,
        {
          method: "PUT",
          body: JSON.stringify(settings),
        }
      );

      setOriginalSettings(settings);
      setHasChanges(false);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FormSection
        title="Invoicing Settings"
        description="Configure how invoices, comments, and payment controls behave for this commitment."
        showDivider={false}
      >
        <div className="space-y-4">
          <ToggleField
            label="Enable invoices"
            hint="Allows invoice creation and invoice-driven workflows for this commitment."
            checked={settings.enable_invoices}
            onCheckedChange={(checked) => updateSetting("enable_invoices", checked)}
          />
          <ToggleField
            label="Enable comments"
            hint="Keeps collaboration notes and approval context attached to commitment invoices."
            checked={settings.enable_comments}
            onCheckedChange={(checked) => updateSetting("enable_comments", checked)}
          />
          <ToggleField
            label="Enable payments"
            hint="Turns on payment issuance tracking from this commitment."
            checked={settings.enable_payments}
            onCheckedChange={(checked) => updateSetting("enable_payments", checked)}
          />
          <ToggleField
            label="Allow overbilling"
            hint="Permits invoices that exceed the current commitment value."
            checked={settings.allow_overbilling}
            onCheckedChange={(checked) => updateSetting("allow_overbilling", checked)}
          />
          <ToggleField
            label="Show cost codes on invoice PDF"
            hint="Includes budget and cost code references in exported invoice documents."
            checked={settings.show_cost_codes_on_pdf}
            onCheckedChange={(checked) => updateSetting("show_cost_codes_on_pdf", checked)}
          />
        </div>
      </FormSection>

      <FormSection
        title="Retainage Settings"
        description="Set how retainage is applied and the default percentage used for billing."
      >
        <div className="space-y-4">
          <ToggleField
            label="Enable completed work retainage"
            hint="Applies retainage to completed work billings."
            checked={settings.enable_completed_work_retainage}
            onCheckedChange={(checked) =>
              updateSetting("enable_completed_work_retainage", checked)
            }
          />
          <ToggleField
            label="Enable stored materials retainage"
            hint="Applies retainage to stored materials billing lines."
            checked={settings.enable_stored_materials_retainage}
            onCheckedChange={(checked) =>
              updateSetting("enable_stored_materials_retainage", checked)
            }
          />
          <div className="max-w-xs space-y-2">
            <Label htmlFor="default_retainage_percent">
              Default Retainage Percent
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="default_retainage_percent"
                type="number"
                min={0}
                max={100}
                value={settings.default_retainage_percent}
                onChange={(e) =>
                  updateSetting(
                    "default_retainage_percent",
                    Number(e.target.value)
                  )
                }
                className="w-24"
              />
              <Text tone="muted">%</Text>
            </div>
          </div>
        </div>
      </FormSection>

      {commitmentType === "subcontract" && (
        <FormSection
          title="Schedule of Values Settings"
          description="Control subcontractor schedule of values behavior for this commitment."
        >
          <div className="space-y-4">
            <ToggleField
              label="Enable subcontractor SOV"
              hint="Enables the subcontractor-facing schedule of values workflow."
              checked={settings.enable_subcontractor_sov}
              onCheckedChange={(checked) =>
                updateSetting("enable_subcontractor_sov", checked)
              }
            />
            <ToggleField
              label="Always editable SOV"
              hint="Allows SOV edits even after the commitment moves forward in workflow."
              checked={settings.enable_always_editable_sov}
              onCheckedChange={(checked) =>
                updateSetting("enable_always_editable_sov", checked)
              }
            />
          </div>
        </FormSection>
      )}

      <FormSection
        title="Financial Markup Settings"
        description="Control markup behavior and whether markup rules are shown on exported change orders."
      >
        <div className="space-y-4">
          <ToggleField
            label="Enable financial markup"
            hint="Turns on commitment markup calculations for downstream change management."
            checked={settings.enable_financial_markup}
            onCheckedChange={(checked) =>
              updateSetting("enable_financial_markup", checked)
            }
          />
          <ToggleField
            label="Show markup criteria on change order PDF"
            hint="Includes the markup basis on commitment change order exports."
            checked={settings.show_markup_criteria_on_pdf}
            onCheckedChange={(checked) =>
              updateSetting("show_markup_criteria_on_pdf", checked)
            }
            disabled={!settings.enable_financial_markup}
          />
        </div>
      </FormSection>

      <FormSection
        title="Notification Settings"
        description="Choose which invoice and payment events trigger email notifications."
      >
        <div className="space-y-4">
          <ToggleField
            label="Send invoice approval notifications"
            hint="Emails stakeholders when commitment invoices move through approval."
            checked={settings.send_invoice_approval_notifications}
            onCheckedChange={(checked) =>
              updateSetting("send_invoice_approval_notifications", checked)
            }
          />
          <ToggleField
            label="Send payment notifications"
            hint="Emails stakeholders when payment activity is recorded."
            checked={settings.send_payment_notifications}
            onCheckedChange={(checked) =>
              updateSetting("send_payment_notifications", checked)
            }
          />
        </div>
      </FormSection>

      <FormSection
        title="Billing Period"
        description="Set the default billing cadence for this commitment."
      >
        <div>
          <div className="max-w-xs">
            <Label htmlFor="billing_period">Billing Period</Label>
            <Select
              value={settings.billing_period}
              onValueChange={(value) =>
                updateSetting(
                  "billing_period",
                  value as CommitmentAdvancedSettings["billing_period"]
                )
              }
            >
              <SelectTrigger id="billing_period" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center justify-between border-t border-border/70 pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
        >
          Reset to Defaults
        </Button>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Text size="sm" tone="muted">
              You have unsaved changes
            </Text>
          )}
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
