"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/unified-modal";
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
      const message =
        error instanceof Error ? error.message : "Failed to add company to project directory.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCompanyName("");
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm">
        <ModalHeader>
          <ModalTitle>Add Company to Directory</ModalTitle>
          <ModalDescription>
            Add a new company to the project directory so it can be selected as a vendor.
          </ModalDescription>
        </ModalHeader>
        <div className="space-y-2">
          <Label htmlFor="add-company-name">Company Name</Label>
          <Input
            id="add-company-name"
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
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
