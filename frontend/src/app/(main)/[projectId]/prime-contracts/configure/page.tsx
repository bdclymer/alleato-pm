"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PageContainer, ProjectPageHeader } from "@/components/layout";

interface PrimeContractSettings {
  project_id: number;
  co_tier_count: 1 | 2;
  allow_standard_users_create_pcco: boolean;
  allow_standard_users_create_pco: boolean;
  sov_always_editable: boolean;
  show_markup_on_co_pdf: boolean;
  show_markup_on_invoice_pdf: boolean;
  default_distribution_prime_contract: string | null;
  default_distribution_pcco: string | null;
  default_distribution_pco: string | null;
}

export default function PrimeContractsConfigurePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [settings, setSettings] = useState<PrimeContractSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/projects/${projectId}/contracts/settings`,
        );
        if (!res.ok) throw new Error("Failed to fetch settings");
        setSettings(await res.json());
      } catch {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [projectId]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const res = await fetch(
        `/api/projects/${projectId}/contracts/settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save settings");
        return;
      }
      setSettings(await res.json());
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof PrimeContractSettings>(
    key: K,
    value: PrimeContractSettings[K],
  ) => setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <>
      <ProjectPageHeader
        title="Configure Prime Contracts"
        description="Project-level settings for how prime contracts behave"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/${projectId}/prime-contracts`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        }
      />

      <PageContainer>
        {loading ? (
          <div className="space-y-6 max-w-2xl">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : settings ? (
          <div className="max-w-2xl space-y-8">

            {/* ================================================================ */}
            {/* CHANGE ORDER WORKFLOW */}
            {/* ================================================================ */}
            <section>
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold">Change Order Workflow</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Controls how change orders are submitted and approved.
              </p>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Number of CO Tiers</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    1-tier: single change order type. 2-tier: PCO (Potential Change Order) → PCCO (Prime Contract Change Order) workflow.
                  </p>
                  <div className="flex gap-3">
                    {([1, 2] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => update("co_tier_count", n)}
                        className={`flex-1 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                          settings.co_tier_count === n
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input hover:bg-muted"
                        }`}
                      >
                        {n === 1 ? "1 Tier" : "2 Tiers"}
                        <p className={`text-xs mt-0.5 font-normal ${settings.co_tier_count === n ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {n === 1 ? "Simple CO flow" : "PCO → PCCO"}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* ================================================================ */}
            {/* PERMISSIONS */}
            {/* ================================================================ */}
            <section>
              <h2 className="text-base font-semibold mb-1">Permissions</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Controls what standard-level project members can do.
              </p>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="allow-pcco" className="text-sm font-medium">
                      Allow standard users to create PCCOs
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, project members with standard access can create Prime Contract Change Orders.
                    </p>
                  </div>
                  <Switch
                    id="allow-pcco"
                    checked={settings.allow_standard_users_create_pcco}
                    onCheckedChange={(v) =>
                      update("allow_standard_users_create_pcco", v)
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="allow-pco" className="text-sm font-medium">
                      Allow standard users to create PCOs
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, project members with standard access can create Potential Change Orders.
                    </p>
                  </div>
                  <Switch
                    id="allow-pco"
                    checked={settings.allow_standard_users_create_pco}
                    onCheckedChange={(v) =>
                      update("allow_standard_users_create_pco", v)
                    }
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ================================================================ */}
            {/* SCHEDULE OF VALUES */}
            {/* ================================================================ */}
            <section>
              <h2 className="text-base font-semibold mb-1">Schedule of Values</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Controls SOV editing behavior.
              </p>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label htmlFor="sov-editable" className="text-sm font-medium">
                    SOV always editable
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When enabled, the Schedule of Values can be edited regardless of the contract&apos;s status. By default, SOV editing is locked on approved contracts.
                  </p>
                </div>
                <Switch
                  id="sov-editable"
                  checked={settings.sov_always_editable}
                  onCheckedChange={(v) => update("sov_always_editable", v)}
                />
              </div>
            </section>

            <Separator />

            {/* ================================================================ */}
            {/* PDF / EXPORT */}
            {/* ================================================================ */}
            <section>
              <h2 className="text-base font-semibold mb-1">PDF & Export Settings</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Controls what information appears in generated PDFs and CSV exports.
              </p>

              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="markup-co-pdf" className="text-sm font-medium">
                      Show markup on CO PDF exports
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Include markup breakdown in change order PDF exports.
                    </p>
                  </div>
                  <Switch
                    id="markup-co-pdf"
                    checked={settings.show_markup_on_co_pdf}
                    onCheckedChange={(v) => update("show_markup_on_co_pdf", v)}
                  />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label htmlFor="markup-invoice-pdf" className="text-sm font-medium">
                      Show markup on invoice PDF/CSV
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Include markup breakdown in invoice and payment application exports.
                    </p>
                  </div>
                  <Switch
                    id="markup-invoice-pdf"
                    checked={settings.show_markup_on_invoice_pdf}
                    onCheckedChange={(v) =>
                      update("show_markup_on_invoice_pdf", v)
                    }
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* ================================================================ */}
            {/* DEFAULT DISTRIBUTIONS */}
            {/* ================================================================ */}
            <section>
              <h2 className="text-base font-semibold mb-1">Default Distributions</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Default email recipients when distributing documents. Enter comma-separated email addresses.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dist-prime">Prime Contract</Label>
                  <Input
                    id="dist-prime"
                    placeholder="e.g. pm@company.com, owner@client.com"
                    value={settings.default_distribution_prime_contract ?? ""}
                    onChange={(e) =>
                      update(
                        "default_distribution_prime_contract",
                        e.target.value || null,
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dist-pcco">PCCO (Prime Contract Change Order)</Label>
                  <Input
                    id="dist-pcco"
                    placeholder="e.g. pm@company.com, owner@client.com"
                    value={settings.default_distribution_pcco ?? ""}
                    onChange={(e) =>
                      update("default_distribution_pcco", e.target.value || null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dist-pco">PCO (Potential Change Order)</Label>
                  <Input
                    id="dist-pco"
                    placeholder="e.g. pm@company.com, super@company.com"
                    value={settings.default_distribution_pco ?? ""}
                    onChange={(e) =>
                      update("default_distribution_pco", e.target.value || null)
                    }
                  />
                </div>
              </div>
            </section>

            {/* Save button at bottom */}
            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>

          </div>
        ) : (
          <p className="text-muted-foreground">Failed to load settings.</p>
        )}
      </PageContainer>
    </>
  );
}
