"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Text } from "@/components/ui/text";

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
  enable_completed_work_retainage: true,
  enable_stored_materials_retainage: false,
  show_cost_codes_on_pdf: true,
  allow_overbilling: false,
  enable_subcontractor_sov: true,
  enable_always_editable_sov: false,
  enable_financial_markup: false,
  show_markup_criteria_on_pdf: false,
  send_invoice_approval_notifications: true,
  send_payment_notifications: true,
  default_retainage_percent: 10,
  billing_period: "monthly",
};

export function AdvancedSettingsTab({
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
      const response = await fetch(
        `/api/commitments/${commitmentId}/advanced-settings`
      );

      if (response.ok) {
        const data = await response.json();
        const loadedSettings = data.data || data || DEFAULT_SETTINGS;
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings);
      } else if (response.status === 404) {
        // No settings saved yet, use defaults
        setSettings(DEFAULT_SETTINGS);
        setOriginalSettings(DEFAULT_SETTINGS);
      } else {
        throw new Error("Failed to load settings");
      }
    } catch (error) {
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
      const response = await fetch(
        `/api/commitments/${commitmentId}/advanced-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

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
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invoicing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Invoicing Settings</CardTitle>
          <CardDescription>
            Configure how invoices work for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_invoices"
                checked={settings.enable_invoices}
                onCheckedChange={(checked) =>
                  updateSetting("enable_invoices", !!checked)
                }
              />
              <Label htmlFor="enable_invoices">Enable Invoices</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_comments"
                checked={settings.enable_comments}
                onCheckedChange={(checked) =>
                  updateSetting("enable_comments", !!checked)
                }
              />
              <Label htmlFor="enable_comments">Enable Comments</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_payments"
                checked={settings.enable_payments}
                onCheckedChange={(checked) =>
                  updateSetting("enable_payments", !!checked)
                }
              />
              <Label htmlFor="enable_payments">Enable Payments</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_overbilling"
                checked={settings.allow_overbilling}
                onCheckedChange={(checked) =>
                  updateSetting("allow_overbilling", !!checked)
                }
              />
              <Label htmlFor="allow_overbilling">Allow Over-billing</Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show_cost_codes_on_pdf"
                checked={settings.show_cost_codes_on_pdf}
                onCheckedChange={(checked) =>
                  updateSetting("show_cost_codes_on_pdf", !!checked)
                }
              />
              <Label htmlFor="show_cost_codes_on_pdf">
                Show Cost Codes on Invoice PDF
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retainage Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Retainage Settings</CardTitle>
          <CardDescription>
            Configure retainage options for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_completed_work_retainage"
                checked={settings.enable_completed_work_retainage}
                onCheckedChange={(checked) =>
                  updateSetting("enable_completed_work_retainage", !!checked)
                }
              />
              <Label htmlFor="enable_completed_work_retainage">
                Enable Completed Work Retainage
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_stored_materials_retainage"
                checked={settings.enable_stored_materials_retainage}
                onCheckedChange={(checked) =>
                  updateSetting("enable_stored_materials_retainage", !!checked)
                }
              />
              <Label htmlFor="enable_stored_materials_retainage">
                Enable Stored Materials Retainage
              </Label>
            </div>
          </div>

          <div className="max-w-xs">
            <Label htmlFor="default_retainage_percent">
              Default Retainage Percent
            </Label>
            <div className="flex items-center gap-2 mt-1">
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
        </CardContent>
      </Card>

      {/* SOV Settings - Only for Subcontracts */}
      {commitmentType === "subcontract" && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule of Values Settings</CardTitle>
            <CardDescription>
              Configure SOV options for this subcontract
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_subcontractor_sov"
                  checked={settings.enable_subcontractor_sov}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_subcontractor_sov", !!checked)
                  }
                />
                <Label htmlFor="enable_subcontractor_sov">
                  Enable Subcontractor SOV
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_always_editable_sov"
                  checked={settings.enable_always_editable_sov}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_always_editable_sov", !!checked)
                  }
                />
                <Label htmlFor="enable_always_editable_sov">
                  Enable Always Editable SOV
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Markup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Markup Settings</CardTitle>
          <CardDescription>
            Configure financial markup options for change orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="enable_financial_markup"
                checked={settings.enable_financial_markup}
                onCheckedChange={(checked) =>
                  updateSetting("enable_financial_markup", !!checked)
                }
              />
              <Label htmlFor="enable_financial_markup">
                Enable Financial Markup
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="show_markup_criteria_on_pdf"
                checked={settings.show_markup_criteria_on_pdf}
                onCheckedChange={(checked) =>
                  updateSetting("show_markup_criteria_on_pdf", !!checked)
                }
                disabled={!settings.enable_financial_markup}
              />
              <Label
                htmlFor="show_markup_criteria_on_pdf"
                className={
                  !settings.enable_financial_markup
                    ? "text-muted-foreground"
                    : ""
                }
              >
                Show Markup Criteria on Change Order PDF
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>
            Configure email notifications for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="send_invoice_approval_notifications"
                checked={settings.send_invoice_approval_notifications}
                onCheckedChange={(checked) =>
                  updateSetting("send_invoice_approval_notifications", !!checked)
                }
              />
              <Label htmlFor="send_invoice_approval_notifications">
                Send Invoice Approval Notifications
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="send_payment_notifications"
                checked={settings.send_payment_notifications}
                onCheckedChange={(checked) =>
                  updateSetting("send_payment_notifications", !!checked)
                }
              />
              <Label htmlFor="send_payment_notifications">
                Send Payment Notifications
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Period */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Period</CardTitle>
          <CardDescription>
            Set the default billing period for this commitment
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
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
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
