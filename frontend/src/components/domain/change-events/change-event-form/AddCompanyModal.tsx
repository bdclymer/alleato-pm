"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";

interface AddCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onCompanyAdded: () => void;
}

interface AddVendorResponse {
  item: {
    id: string;
    vendor_name: string;
    company_id: string;
    company: string;
  };
  alreadyLinked: boolean;
}

export function AddCompanyModal({
  open,
  onOpenChange,
  projectId,
  onCompanyAdded,
}: AddCompanyModalProps) {
  const [companyName, setCompanyName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    const trimmed = companyName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const result = await apiFetch<AddVendorResponse>(
        `/api/projects/${projectId}/vendors`,
        {
          method: "POST",
          body: JSON.stringify({ name: trimmed }),
        },
      );

      setCompanyName("");
      onOpenChange(false);
      onCompanyAdded();

      if (result?.alreadyLinked) {
        toast.info(`${trimmed} is already linked to this project.`);
      } else {
        toast.success(`${trimmed} added to project directory.`);
      }
    } catch (error) {
      // apiFetch throws ApiError with the real server message. Surface it
      // instead of swallowing the failure silently (per CLAUDE.md Rule 2).
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add company to project directory.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-sm">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h3 className="text-lg font-semibold">Add Company to Directory</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new company to the project directory so it can be selected as a vendor.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Enter company name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCompanyName("");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!companyName.trim() || saving}
          >
            {saving ? "Adding..." : "Add Company"}
          </Button>
        </div>
      </div>
    </div>
  );
}
