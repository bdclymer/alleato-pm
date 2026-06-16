"use client";

import * as React from "react";

import { CheckboxField } from "@/components/forms/CheckboxField";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { DateField } from "@/components/forms/DateField";
import { FormGrid } from "@/components/forms";
import { FormSection } from "@/components/forms/FormSection";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { NumberField } from "@/components/forms/NumberField";
import { RichTextField } from "@/components/forms/RichTextField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Modal as Dialog,
  ModalContent as DialogContent,
  ModalDescription as DialogDescription,
  ModalFooter as DialogFooter,
  ModalHeader as DialogHeader,
  ModalTitle as DialogTitle,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ContractFormData } from "./types";

type ValidationErrors = Partial<Record<"number" | "title", string>>;

export function PrimeContractGeneralInfoSection({
  formData,
  validationErrors,
  companyOptions,
  companiesLoading,
  contractStatuses,
  attachments,
  isSubmitting,
  onCreateCompany,
  onClearValidationError,
  onUpdateFormData,
  onAttachmentChange,
  onFilesSelected,
}: {
  formData: Partial<ContractFormData>;
  validationErrors: ValidationErrors;
  companyOptions: Array<{ value: string; label: string }>;
  companiesLoading: boolean;
  contractStatuses: Array<{ value: string; label: string }>;
  attachments?: NonNullable<ContractFormData["attachments"]>;
  isSubmitting?: boolean;
  onCreateCompany: () => void;
  onClearValidationError: (field: "number" | "title") => void;
  onUpdateFormData: (updates: Partial<ContractFormData>) => void;
  onAttachmentChange?: (
    nextFiles: NonNullable<ContractFormData["attachments"]>
  ) => void;
  onFilesSelected?: (files: File[]) => void;
}) {
  return (
    <FormSection title="General Information">
      <div className="space-y-8">
        <FormGrid columns={2} className="gap-y-8">
          <TextField
            label="Contract #"
            value={formData.number || ""}
            onChange={(e) => {
              onClearValidationError("number");
              onUpdateFormData({ number: e.target.value });
            }}
            placeholder="Enter contract number"
            error={validationErrors.number}
            required
          />
          <SearchableSelect
            label="Owner/Client"
            options={companyOptions}
            value={formData.ownerCompanyId}
            onValueChange={(value) =>
              onUpdateFormData({
                ownerCompanyId: value,
                contractCompanyId: value,
              })
            }
            placeholder="Select company"
            searchPlaceholder="Search"
            disabled={companiesLoading}
            triggerTestId="owner-client-select"
            optionTestIdPrefix="owner-client-option"
            onCreateNew={onCreateCompany}
            createNewLabel="+ Create New Company"
          />
          <TextField
            label="Title"
            value={formData.title || ""}
            onChange={(e) => {
              onClearValidationError("title");
              onUpdateFormData({ title: e.target.value });
            }}
            placeholder="Enter title"
            error={validationErrors.title}
            required
          />
          <SelectField
            label="Status"
            options={contractStatuses}
            value={formData.status || "draft"}
            onValueChange={(value) => onUpdateFormData({ status: value })}
            required
          />
          <SearchableSelect
            label="Contractor"
            options={companyOptions}
            value={formData.contractorId}
            onValueChange={(value) => onUpdateFormData({ contractorId: value })}
            placeholder="Select contractor"
            searchPlaceholder="Search"
            disabled={companiesLoading}
          />
          <SearchableSelect
            label="Architect/Engineer"
            options={companyOptions}
            value={formData.architectEngineerId}
            onValueChange={(value) => onUpdateFormData({ architectEngineerId: value })}
            placeholder="Select architect/engineer"
            searchPlaceholder="Search"
            disabled={companiesLoading}
          />
          <NumberField
            label="Default Retainage"
            value={formData.defaultRetainage}
            onChange={(value) => onUpdateFormData({ defaultRetainage: value })}
            suffix="%"
            placeholder=""
            min={0}
            max={100}
          />
          <div className="flex items-start gap-x-2">
            <Label className="w-40 shrink-0 pt-2 text-[13px] font-medium text-foreground">
              Executed
            </Label>
            <div className="flex h-10 min-w-0 flex-1 items-center">
              <Checkbox
                id="executed"
                checked={formData.executed || false}
                onCheckedChange={(checked) =>
                  onUpdateFormData({ executed: checked === true })
                }
              />
              <Label htmlFor="executed" className="ml-2 text-sm font-normal">
                Contract is executed
              </Label>
            </div>
          </div>
        </FormGrid>

        <RichTextField
          label="Description"
          value={formData.description || ""}
          onChange={(value) => onUpdateFormData({ description: value })}
          placeholder="Enter contract description..."
          fullWidth
        />

        {attachments && onAttachmentChange && onFilesSelected ? (
          <FileUploadField
            label="Attachments"
            value={attachments}
            onChange={onAttachmentChange}
            onFilesSelected={onFilesSelected}
            multiple
            maxFiles={20}
            maxSize={50 * 1024 * 1024}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            disabled={isSubmitting}
            variant="minimal"
          />
        ) : null}
      </div>
    </FormSection>
  );
}

export function PrimeContractDatesSection({
  formData,
  onUpdateFormData,
}: {
  formData: Partial<ContractFormData>;
  onUpdateFormData: (updates: Partial<ContractFormData>) => void;
}) {
  return (
    <FormSection title="Contract Dates">
      <FormGrid columns={2} className="gap-y-8">
        <DateField
          label="Start Date"
          value={formData.startDate}
          onChange={(date) => onUpdateFormData({ startDate: date })}
          placeholder="mm / dd / yyyy"
        />
        <DateField
          label="Estimated Completion Date"
          value={formData.estimatedCompletionDate}
          onChange={(date) => onUpdateFormData({ estimatedCompletionDate: date })}
          placeholder="mm / dd / yyyy"
        />
        <DateField
          label="Substantial Completion Date"
          labelTooltip="Date when work is sufficiently complete for its intended use."
          value={formData.substantialCompletionDate}
          onChange={(date) => onUpdateFormData({ substantialCompletionDate: date })}
          placeholder="mm / dd / yyyy"
        />
        <DateField
          label="Actual Completion Date"
          value={formData.actualCompletionDate}
          onChange={(date) => onUpdateFormData({ actualCompletionDate: date })}
          placeholder="mm / dd / yyyy"
        />
        <DateField
          label="Signed Contract Received Date"
          value={formData.signedContractReceivedDate}
          onChange={(date) => onUpdateFormData({ signedContractReceivedDate: date })}
          placeholder="mm / dd / yyyy"
        />
        <DateField
          label="Contract Termination Date"
          value={formData.contractTerminationDate}
          onChange={(date) => onUpdateFormData({ contractTerminationDate: date })}
          placeholder="mm / dd / yyyy"
        />
      </FormGrid>
    </FormSection>
  );
}

export function PrimeContractDescriptionSection({
  formData,
  onUpdateFormData,
}: {
  formData: Partial<ContractFormData>;
  onUpdateFormData: (updates: Partial<ContractFormData>) => void;
}) {
  return (
    <FormSection title="Description">
      <FormGrid columns={12} className="gap-y-8">
        <div className="col-span-12">
          <RichTextField
            label="Description"
            value={formData.description || ""}
            onChange={(value) => onUpdateFormData({ description: value })}
            placeholder="Enter contract description..."
            fullWidth
          />
        </div>
      </FormGrid>
    </FormSection>
  );
}

export function PrimeContractAttachmentsSection({
  attachments,
  isSubmitting,
  onChange,
  onFilesSelected,
}: {
  attachments: NonNullable<ContractFormData["attachments"]>;
  isSubmitting: boolean;
  onChange: (nextFiles: NonNullable<ContractFormData["attachments"]>) => void;
  onFilesSelected: (files: File[]) => void;
}) {
  return (
    <FormSection title="Attachments">
      <FileUploadField
        value={attachments}
        onChange={onChange}
        onFilesSelected={onFilesSelected}
        multiple
        maxFiles={20}
        maxSize={50 * 1024 * 1024}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        disabled={isSubmitting}
        variant="minimal"
      />
    </FormSection>
  );
}

export function PrimeContractScopeSection({
  formData,
  onUpdateFormData,
}: {
  formData: Partial<ContractFormData>;
  onUpdateFormData: (updates: Partial<ContractFormData>) => void;
}) {
  return (
    <FormSection title="Inclusions & Exclusions">
      <FormGrid columns={12}>
        <div className="col-span-12">
          <RichTextField
            label="Inclusions"
            value={formData.inclusions || ""}
            onChange={(value) => onUpdateFormData({ inclusions: value })}
            placeholder="Enter what is included in contract scope..."
            fullWidth
          />
        </div>
        <div className="col-span-12">
          <RichTextField
            label="Exclusions"
            value={formData.exclusions || ""}
            onChange={(value) => onUpdateFormData({ exclusions: value })}
            placeholder="Enter what is excluded from contract scope..."
            fullWidth
          />
        </div>
      </FormGrid>
    </FormSection>
  );
}

export function PrimeContractPrivacySection({
  formData,
  userOptions,
  onUpdateFormData,
}: {
  formData: Partial<ContractFormData>;
  userOptions: Array<{ value: string; label: string }>;
  onUpdateFormData: (updates: Partial<ContractFormData>) => void;
}) {
  return (
    <FormSection
      title="Contract Privacy"
      description="Using the privacy setting allows only project admins and select non-admin users access."
      className="border-b-0 pb-0"
    >
      <div className="space-y-4">
        <CheckboxField
          label="Private"
          checked={formData.isPrivate || false}
          onCheckedChange={(checked) => onUpdateFormData({ isPrivate: checked })}
        />

        <div className="space-y-4 border-l-2 border-border pl-6">
          <MultiSelectField
            label="Access for Non-Admin Users"
            options={userOptions}
            value={formData.allowedUsers || []}
            onChange={(values) => onUpdateFormData({ allowedUsers: values })}
            placeholder="Select project users"
            fullWidth
            hint={
              formData.isPrivate
                ? "Choose which non-admin project users can access this contract."
                : "Enable Private to configure non-admin user access."
            }
            disabled={!formData.isPrivate}
          />

          <CheckboxField
            label="Allow these non-admin users to view the SOV items."
            checked={formData.allowedUsersCanSeeSov || false}
            onCheckedChange={(checked) =>
              onUpdateFormData({ allowedUsersCanSeeSov: checked })
            }
            disabled={!formData.isPrivate}
          />
        </div>
      </div>
    </FormSection>
  );
}

export function PrimeContractAddCompanyDialog({
  open,
  companyName,
  isCreating,
  onOpenChange,
  onCompanyNameChange,
  onCreate,
}: {
  open: boolean;
  companyName: string;
  isCreating: boolean;
  onOpenChange: (open: boolean) => void;
  onCompanyNameChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Create a new company for the owner/client. It will be automatically added to the project directory.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="company-name">Company Name *</Label>
          <Input
            id="company-name"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="Enter company name"
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onCreate}
            disabled={!companyName.trim() || isCreating}
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
