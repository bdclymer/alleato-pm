"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onCompanyAdded: () => void;
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
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim() }),
      });
      if (response.ok) {
        setCompanyName("");
        onOpenChange(false);
        onCompanyAdded();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-sm">
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
