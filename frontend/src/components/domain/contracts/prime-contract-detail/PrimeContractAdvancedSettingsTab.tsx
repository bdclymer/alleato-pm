"use client";

import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface PrimeContractSettings {
  project_id: number;
  co_tier_count: 1 | 2;
  allow_standard_users_create_pcco: boolean;
  allow_standard_users_create_pco: boolean;
  sov_always_editable: boolean;
  enable_completed_work_retainage: boolean;
  enable_stored_materials_retainage: boolean;
  default_retainage_percent: number;
  show_markup_on_co_pdf: boolean;
  show_markup_on_invoice_pdf: boolean;
  default_distribution_prime_contract: string | null;
  default_distribution_pcco: string | null;
  default_distribution_pco: string | null;
}

interface PrimeContractAdvancedSettingsTabProps {
  projectId: string;
  contractId: string;
  advancedSettings: PrimeContractSettings | null;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<PrimeContractSettings | null>>;
  advancedSettingsLoading: boolean;
  advancedSettingsSaving: boolean;
  setAdvancedSettingsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  contractAdvancedDraft: {
    inclusions: string;
    exclusions: string;
    is_private: boolean;
    payment_terms: string;
    billing_schedule: string;
  };
  setContract: React.Dispatch<React.SetStateAction<import("@/app/(main)/[projectId]/prime-contracts/[contractId]/types").Contract | null>>;
}

export function PrimeContractAdvancedSettingsTab({
  projectId,
  contractId,
  advancedSettings,
  setAdvancedSettings,
  advancedSettingsLoading,
  advancedSettingsSaving,
  setAdvancedSettingsSaving,
  contractAdvancedDraft,
  setContract,
}: PrimeContractAdvancedSettingsTabProps) {
  const updateAdvancedSetting = <K extends keyof PrimeContractSettings>(
    key: K,
    value: PrimeContractSettings[K],
  ) => {
    setAdvancedSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveAdvancedSettings = async () => {
    if (!advancedSettings) {
      toast.error("Project settings not loaded");
      return;
    }

    setAdvancedSettingsSaving(true);
    try {
      const [projectSettingsRes, contractRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/contracts/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(advancedSettings),
        }),
        fetch(`/api/projects/${projectId}/contracts/${contractId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inclusions: contractAdvancedDraft.inclusions || null,
            exclusions: contractAdvancedDraft.exclusions || null,
            is_private: contractAdvancedDraft.is_private,
            retention_percentage: advancedSettings.default_retainage_percent,
            payment_terms: contractAdvancedDraft.payment_terms || null,
            billing_schedule: contractAdvancedDraft.billing_schedule || null,
          }),
        }),
      ]);

      if (!projectSettingsRes.ok) {
        const err = await projectSettingsRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to save project contract settings");
      }
      if (!contractRes.ok) {
        const err = await contractRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to save contract advanced settings");
      }

      const [savedProjectSettings, savedContract] = await Promise.all([
        projectSettingsRes.json() as Promise<PrimeContractSettings>,
        contractRes.json(),
      ]);
      setAdvancedSettings(savedProjectSettings);
      setContract((prev) => (prev ? { ...prev, ...savedContract } : prev));
      toast.success("Advanced settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save advanced settings");
    } finally {
      setAdvancedSettingsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {advancedSettingsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="max-w-xl space-y-0 bg-background">
          <section>
            <h3 className="text-xl font-semibold tracking-tight">Advanced Settings</h3>
          </section>

          <section className="py-6">
            <h4 className="text-lg font-semibold text-foreground">Financial Markup</h4>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox
                id="enable-financial-markups"
                checked={advancedSettings?.show_markup_on_co_pdf ?? true}
                onCheckedChange={(checked) =>
                  updateAdvancedSetting("show_markup_on_co_pdf", !!checked)
                }
              />
              <Label htmlFor="enable-financial-markups" className="text-[15px] font-medium">
                Enable Financial Markups
              </Label>
            </div>
          </section>

          <section className="py-4">
            <h4 className="text-lg font-semibold text-foreground">Owner Invoices</h4>
            <div className="mt-4 space-y-5">
              <div className="flex items-center gap-3">
                <Checkbox id="enable-owner-invoices" checked disabled />
                <Label htmlFor="enable-owner-invoices" className="text-[15px] font-medium text-foreground">
                  Enable Owner Invoices
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="approve-sub-invoices" checked={false} disabled />
                <Label htmlFor="approve-sub-invoices" className="text-[15px] text-muted-foreground">
                  Approve Subcontractor Invoices when Owner Approves Owner Invoice
                </Label>
              </div>
            </div>
          </section>

          <section className="py-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-foreground">Retainage</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 text-muted-foreground hover:bg-transparent"
                    aria-label="Retainage settings info"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-lg text-left">
                  Retainage defaults control how work completed and stored materials are
                  billed on prime contract payment applications.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Configure the default retainage rules used when payment applications are
              populated.
            </p>
            <div className="mt-4 space-y-5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="enable-completed-work-retainage"
                  checked={advancedSettings?.enable_completed_work_retainage ?? true}
                  onCheckedChange={(checked) =>
                    updateAdvancedSetting("enable_completed_work_retainage", !!checked)
                  }
                />
                <Label
                  htmlFor="enable-completed-work-retainage"
                  className="text-[15px] font-medium text-foreground"
                >
                  Enable Completed Work Retainage
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="enable-stored-materials-retainage"
                  checked={advancedSettings?.enable_stored_materials_retainage ?? false}
                  onCheckedChange={(checked) =>
                    updateAdvancedSetting("enable_stored_materials_retainage", !!checked)
                  }
                />
                <Label
                  htmlFor="enable-stored-materials-retainage"
                  className="text-[15px] font-medium text-foreground"
                >
                  Enable Stored Materials Retainage
                </Label>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="default-retainage-percent" className="text-[15px] font-medium text-foreground">
                  Default Retainage Percent
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="default-retainage-percent"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={advancedSettings?.default_retainage_percent ?? 0}
                    onChange={(e) =>
                      updateAdvancedSetting(
                        "default_retainage_percent",
                        Number(e.target.value || 0),
                      )
                    }
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="py-4">
            <h4 className="text-lg font-semibold text-foreground">PDF Export</h4>
            <p className="mt-1 text-[15px] text-muted-foreground">
              Choose what items are displayed on exported invoice PDFs.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox
                id="show-budget-code"
                checked={advancedSettings?.show_markup_on_invoice_pdf ?? true}
                onCheckedChange={(checked) =>
                  updateAdvancedSetting("show_markup_on_invoice_pdf", !!checked)
                }
              />
              <Label htmlFor="show-budget-code" className="text-[15px] font-medium text-foreground">
                Show Budget Code
              </Label>
            </div>
          </section>

          <section className="py-4">
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-foreground">Change Orders</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 text-muted-foreground hover:bg-transparent"
                    aria-label="Change orders level of detail info"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-lg text-left">
                  The level of detail that is selected here determines how change orders will
                  be displayed on the detail page of the Invoice when being viewed or printed
                  from Procore. The entry and editing of this information will always occur at
                  the line item level of detail.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-3 max-w-md">
              <Label htmlFor="co-tier-count" className="sr-only">Change order workflow</Label>
              <select
                id="co-tier-count"
                value={String(advancedSettings?.co_tier_count ?? 1)}
                onChange={(e) =>
                  updateAdvancedSetting(
                    "co_tier_count",
                    e.target.value === "1" ? 1 : 2,
                  )
                }
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-[16px] shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="1">Prime Contract Change Order</option>
                <option value="2">Line Items in each Potential Change Order (PCO)</option>
              </select>
            </div>
          </section>

          <section className="py-4">
            <h4 className="text-lg font-semibold text-foreground">Payments Received</h4>
            <div className="mt-4 flex items-center gap-3">
              <Checkbox id="enable-payments" checked disabled />
              <Label htmlFor="enable-payments" className="text-[15px] font-medium text-foreground">
                Enable Payments
              </Label>
            </div>
          </section>

          <section className="flex py-6">
            <Button onClick={saveAdvancedSettings} disabled={advancedSettingsSaving || !advancedSettings}>
              {advancedSettingsSaving ? "Saving..." : "Save Advanced Settings"}
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
