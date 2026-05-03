"use client";

import * as React from "react";
import { Form } from "@/components/forms/Form";
import { FormActions } from "@/components/forms/FormActions";
import { FormLayoutProvider } from "@/components/forms/FormField";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { isDevelopment } from "@/lib/dev-autofill";
import {
  PrimeContractAddCompanyDialog,
  PrimeContractAttachmentsSection,
  PrimeContractDatesSection,
  PrimeContractDescriptionSection,
  PrimeContractGeneralInfoSection,
  PrimeContractPrivacySection,
  PrimeContractScopeSection,
} from "@/components/domain/contracts/prime-contract-form/sections";
import type { BudgetCode, ContractFormData, SOVLineItem } from "@/components/domain/contracts/prime-contract-form/types";
import {
  PrimeContractCreateBudgetCodeModal,
  PrimeContractSovSection,
} from "@/components/domain/contracts/prime-contract-form/sov";
import { usePrimeContractFormState } from "@/components/domain/contracts/prime-contract-form/usePrimeContractFormState";

// ============================================================================
// Types
// ============================================================================

export type { ContractFormData, SOVLineItem } from "@/components/domain/contracts/prime-contract-form/types";

interface ContractFormProps {
  initialData?: Partial<ContractFormData>;
  onSubmit: (data: ContractFormData, attachmentFiles?: File[]) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "out_for_signature", label: "Out for Signature" },
  { value: "approved", label: "Approved" },
  { value: "complete", label: "Complete" },
  { value: "terminated", label: "Terminated" },
];


// ============================================================================
// Main Component
// ============================================================================

export function ContractForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ContractFormProps) {
  const {
    formData,
    validationErrors,
    budgetCodes,
    loadingBudgetCodes,
    openBudgetCodePopover,
    budgetCodeSearchQuery,
    showCreateBudgetCodeModal,
    newBudgetCodeData,
    availableCostCodes,
    loadingCostCodes,
    expandedDivisions,
    groupedCostCodes,
    showImportFromBudget,
    sovActionMenuKey,
    companyOptions,
    companiesLoading,
    userOptions,
    showAddCompany,
    newCompanyName,
    isCreating,
    filteredBudgetCodes,
    isUnitQuantityMode,
    sovColumnCount,
    sovTotals,
    handleSubmit,
    updateFormData,
    clearValidationError,
    handleCreateCompany,
    getCostTypeLabel,
    toggleDivision,
    handleCreateBudgetCode,
    handleBudgetCodeSelect,
    addSOVLine,
    addSOVGroup,
    updateSOVLine,
    removeSOVLine,
    toggleSovAccountingMethod,
    handleImportFromBudgetSuccess,
    handleAttachmentListChange,
    handleFilesSelected,
    handleAutoFill,
    setOpenBudgetCodePopover,
    setBudgetCodeSearchQuery,
    setShowCreateBudgetCodeModal,
    setNewBudgetCodeData,
    setShowImportFromBudget,
    setSovActionMenuKey,
    setShowAddCompany,
    setNewCompanyName,
  } = usePrimeContractFormState({
    initialData,
    projectId,
    onSubmit,
  });

  return (
    <Form
      onSubmit={handleSubmit}
      data-testid="prime-contract-form"
      data-dev-autofill-disabled
    >
      <FormLayoutProvider layout="stacked">
        <div className="flex flex-col gap-16">
          <PrimeContractGeneralInfoSection
            formData={formData}
            validationErrors={validationErrors}
            companyOptions={companyOptions}
            companiesLoading={companiesLoading}
            contractStatuses={CONTRACT_STATUSES}
            onCreateCompany={() => setShowAddCompany(true)}
            onClearValidationError={clearValidationError}
            onUpdateFormData={updateFormData}
          />

          {mode === "create" ? (
            <PrimeContractAttachmentsSection
              attachments={formData.attachments || []}
              isSubmitting={isSubmitting}
              onChange={handleAttachmentListChange}
              onFilesSelected={handleFilesSelected}
            />
          ) : null}

          <PrimeContractDatesSection
            formData={formData}
            onUpdateFormData={updateFormData}
          />

          <PrimeContractDescriptionSection
            formData={formData}
            onUpdateFormData={updateFormData}
          />

          <PrimeContractSovSection
            projectId={projectId}
            formData={formData}
            budgetCodes={budgetCodes}
            loadingBudgetCodes={loadingBudgetCodes}
            filteredBudgetCodes={filteredBudgetCodes}
            openBudgetCodePopover={openBudgetCodePopover}
            budgetCodeSearchQuery={budgetCodeSearchQuery}
            sovActionMenuKey={sovActionMenuKey}
            showImportFromBudget={showImportFromBudget}
            sovColumnCount={sovColumnCount}
            isUnitQuantityMode={isUnitQuantityMode}
            sovTotals={sovTotals}
            onBudgetCodeSearchQueryChange={setBudgetCodeSearchQuery}
            onSovActionMenuKeyChange={setSovActionMenuKey}
            onOpenBudgetCodePopoverChange={setOpenBudgetCodePopover}
            onShowImportFromBudgetChange={setShowImportFromBudget}
            onShowCreateBudgetCodeModal={() => setShowCreateBudgetCodeModal(true)}
            onToggleSovAccountingMethod={toggleSovAccountingMethod}
            onAddSovGroup={addSOVGroup}
            onAddSovLine={addSOVLine}
            onUpdateSovLine={updateSOVLine}
            onRemoveSovLine={removeSOVLine}
            onHandleBudgetCodeSelect={handleBudgetCodeSelect}
            onHandleImportFromBudgetSuccess={handleImportFromBudgetSuccess}
          />

          <PrimeContractScopeSection
            formData={formData}
            onUpdateFormData={updateFormData}
          />

          <PrimeContractPrivacySection
            formData={formData}
            userOptions={userOptions}
            onUpdateFormData={updateFormData}
          />
        </div>
      </FormLayoutProvider>

      <PrimeContractAddCompanyDialog
        open={showAddCompany}
        companyName={newCompanyName}
        isCreating={isCreating}
        onOpenChange={setShowAddCompany}
        onCompanyNameChange={setNewCompanyName}
        onCreate={handleCreateCompany}
      />

      <FormActions
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel={mode === "create" ? "Create Prime Contract" : "Save Changes"}
      >
        {isDevelopment ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleAutoFill}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Auto-fill
          </Button>
        ) : null}
      </FormActions>

      <PrimeContractCreateBudgetCodeModal
        open={showCreateBudgetCodeModal}
        loadingCostCodes={loadingCostCodes}
        groupedCostCodes={groupedCostCodes}
        expandedDivisions={expandedDivisions}
        availableCostCodes={availableCostCodes}
        newBudgetCodeData={newBudgetCodeData}
        isCreating={isCreating}
        getCostTypeLabel={getCostTypeLabel}
        onOpenChange={setShowCreateBudgetCodeModal}
        onToggleDivision={toggleDivision}
        onNewBudgetCodeDataChange={setNewBudgetCodeData}
        onCreate={handleCreateBudgetCode}
      />
    </Form>
  );
}
