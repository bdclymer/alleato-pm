"use client";

import * as React from "react";

import {
  FileUploadField,
  Form,
  FormSection,
} from "@/components/forms";
import { FormActions } from "@/components/forms/FormActions";
import { CreateBudgetCodeModal } from "@/app/(main)/[projectId]/budget/setup/components/CreateBudgetCodeModal";

import {
  GeneralInfoSection,
  LineItemsSection,
  AddCompanyModal,
  useChangeEventFormData,
} from "./change-event-form";

import type { ChangeEventFormData, ChangeEventFormProps } from "./change-event-form";

// Re-export types for backwards compatibility
export type { ChangeEventFormData, ChangeEventLineItem } from "./change-event-form";

export function ChangeEventForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ChangeEventFormProps) {
  const {
    formData,
    nextNumber,
    errors,
    updateFormData,
    updateLineItem,
    vendors,
    contracts,
    budgetCodes,
    primeContractOptions,
    primeContractSelectOptions,
    commitmentLineItemsMap,
    addCompanyOpen,
    setAddCompanyOpen,
    showCreateBudgetCodeModal,
    setShowCreateBudgetCodeModal,
    setTargetBudgetCodeRowIndex,
    handleCommitmentChange,
    handleCommitmentLineItemChange,
    handleAddAllCommitmentLineItems,
    addLineItem,
    removeLineItem,
    csvInputRef,
    handleCsvImport,
    attachmentsAsInfo,
    setFormData,
    handleBudgetCodeCreated,
    fetchVendors,
    validate,
  } = useChangeEventFormData({ initialData, projectId });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      // Scroll to the first visible field error so it's not hidden below the fold
      requestAnimationFrame(() => {
        const firstError = document.querySelector<HTMLElement>("[data-field-error]");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
      return;
    }
    await onSubmit(formData);
  };

  return (
    <>
      <AddCompanyModal
        open={addCompanyOpen}
        onOpenChange={setAddCompanyOpen}
        projectId={projectId}
        onCompanyAdded={fetchVendors}
      />

      <Form
        onSubmit={handleSubmit}
        data-dev-autofill-disabled="true"
        data-form-id="change-event-create"
      >
        <div className="space-y-10">
          <GeneralInfoSection
            formData={formData}
            nextNumber={nextNumber}
            errors={errors}
            updateFormData={updateFormData}
            primeContractSelectOptions={primeContractSelectOptions}
            hasPrimeContracts={primeContractOptions.length > 0}
            projectId={projectId}
            showDescription={mode !== "edit"}
          />

          <LineItemsSection
            lineItems={formData.lineItems}
            updateLineItem={updateLineItem}
            addLineItem={addLineItem}
            removeLineItem={removeLineItem}
            vendors={vendors}
            contracts={contracts}
            budgetCodes={budgetCodes}
            commitmentLineItemsMap={commitmentLineItemsMap}
            onAddCompany={() => setAddCompanyOpen(true)}
            onCreateBudgetCode={(rowIndex) => {
              setTargetBudgetCodeRowIndex(rowIndex);
              setShowCreateBudgetCodeModal(true);
            }}
            handleCommitmentChange={handleCommitmentChange}
            handleCommitmentLineItemChange={handleCommitmentLineItemChange}
            expectingRevenue={formData.expectingRevenue ?? true}
            csvInputRef={csvInputRef}
            handleCsvImport={handleCsvImport}
            handleAddAllCommitmentLineItems={handleAddAllCommitmentLineItems}
            lineItemRevenueSource={formData.lineItemRevenueSource}
          />

          <FormSection title="Attachments">
            <div className="max-w-3xl">
              <FileUploadField
                value={attachmentsAsInfo}
                multiple
                variant="minimal"
                onFilesSelected={(files) => {
                  setFormData((prev) => ({
                    ...prev,
                    attachments: [...prev.attachments, ...files],
                  }));
                }}
                onChange={(nextFiles) => {
                  const remaining = nextFiles.map(
                    (f) => `${f.name}:${f.size}:${f.type || ""}`,
                  );
                  setFormData((prev) => ({
                    ...prev,
                    attachments: prev.attachments.filter((file) =>
                      remaining.includes(`${file.name}:${file.size}:${file.type || ""}`),
                    ),
                  }));
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic,.csv"
                maxSize={25 * 1024 * 1024}
              />
            </div>
          </FormSection>

          <FormActions
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            submitLabel={mode === "create" ? "Create Change Event" : "Update Change Event"}
            submitDataTestId={mode === "create" ? "change-event-create-submit" : "change-event-update-submit"}
          />
        </div>
      </Form>

      <CreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        onOpenChange={(open) => {
          setShowCreateBudgetCodeModal(open);
          if (!open) {
            setTargetBudgetCodeRowIndex(null);
          }
        }}
        projectId={String(projectId)}
        onSuccess={handleBudgetCodeCreated}
      />
    </>
  );
}
