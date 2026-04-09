"use client";

import * as React from "react";
import { AlertCircle, Loader2, Wand2 } from "lucide-react";
import { FormProvider } from "react-hook-form";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type {
  CreateSubcontractInput,
  SovLineItem,
} from "@/lib/schemas/create-subcontract-schema";
import {
  ContractDatesSection,
  CreateBudgetCodeModal,
  GeneralInfoSection,
  InclusionsExclusionsSection,
  InvoiceContactsSection,
  PrivacySection,
  SovSection,
} from "./subcontract-form";
import { useSubcontractFormState } from "./subcontract-form/useSubcontractFormState";

interface CreateSubcontractFormProps {
  projectId: number;
  onSubmit: (data: CreateSubcontractInput, attachmentFiles?: File[]) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateSubcontractInput> & {
    sovLines?: SovLineItem[];
  };
  mode?: "create" | "edit";
}

export function CreateSubcontractForm({
  projectId,
  onSubmit,
  onCancel,
  initialData,
  mode = "create",
}: CreateSubcontractFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [errorDetails, setErrorDetails] = React.useState<unknown>(null);
  const [showCreateBudgetCodeModal, setShowCreateBudgetCodeModal] = React.useState(false);
  const [isAutoFilling, setIsAutoFilling] = React.useState(false);

  const {
    methods,
    sovLines,
    setSovLines,
    attachments,
    pendingAttachmentFiles,
    budgetCodes,
    setBudgetCodes,
    loadingBudgetCodes,
    vendorOptions,
    isLoadingVendors,
    accountingMethod,
    toggleAccountingMethod,
    userOptions,
    isLoadingUsers,
    invoiceContactOptions,
    isLoadingContacts,
    refetchContacts,
    vendorId,
    vendorCompanyId,
    handleAttachmentListChange,
    handleFilesSelected,
  } = useSubcontractFormState({ projectId, initialData, mode: mode ?? "create" });

  const { handleSubmit, setValue } = methods;
  const showAutoFill = process.env.NODE_ENV === "development";

  const handleFormSubmit = async (data: CreateSubcontractInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setErrorDetails(null);
    try {
      await onSubmit(
        { ...data, sov: sovLines, attachments: attachments.map((a) => ({ name: a.name, size: a.size, type: a.type })) },
        pendingAttachmentFiles,
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An unexpected error occurred");
      setErrorDetails(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDevAutoFill = () => {
    setIsAutoFilling(true);
    try {
      const now = Date.now();
      const defaultCompanyId = vendorOptions[0]?.value || "";
      setValue("title", `Autofilled subcontract ${now}`, { shouldValidate: true });
      setValue("contractNumber", `SC-${now}`, { shouldValidate: true });
      setValue("status", "Draft", { shouldValidate: true });
      setValue("description", "Autofilled subcontract for form verification.", { shouldValidate: true });
      if (defaultCompanyId) setValue("contractCompanyId", defaultCompanyId, { shouldValidate: true });
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="space-y-8">
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Submission Failed</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{submitError}</p>
                {errorDetails &&
                typeof errorDetails === "object" &&
                "details" in (errorDetails as Record<string, unknown>) ? (
                  <div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        View Error Details
                      </summary>
                      <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify((errorDetails as Record<string, unknown>).details, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-8">
            <GeneralInfoSection
              isSubmitting={isSubmitting}
              vendorOptions={vendorOptions}
              isLoadingVendors={isLoadingVendors}
            />

            <section className="space-y-4 border-b border-border/70 pb-8">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Attachments</h2>
                <p className="text-sm text-muted-foreground">
                  Attach contract documents, plans, or other relevant files
                </p>
              </div>
              <FileUploadField
                label=""
                value={attachments}
                onChange={handleAttachmentListChange}
                onFilesSelected={handleFilesSelected}
                multiple
                maxFiles={20}
                maxSize={50 * 1024 * 1024}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                disabled={isSubmitting}
              />
            </section>

            <SovSection
              sovLines={sovLines}
              onSovLinesChange={setSovLines}
              accountingMethod={accountingMethod}
              onToggleAccountingMethod={toggleAccountingMethod}
              budgetCodes={budgetCodes}
              loadingBudgetCodes={loadingBudgetCodes}
              onCreateBudgetCode={() => setShowCreateBudgetCodeModal(true)}
              isSubmitting={isSubmitting}
            />

            <InclusionsExclusionsSection isSubmitting={isSubmitting} />
            <ContractDatesSection isSubmitting={isSubmitting} />
            <PrivacySection isSubmitting={isSubmitting} userOptions={userOptions} isLoadingUsers={isLoadingUsers} />
            <InvoiceContactsSection isSubmitting={isSubmitting} invoiceContactOptions={invoiceContactOptions} isLoadingContacts={isLoadingContacts} vendorId={vendorId} vendorCompanyId={vendorCompanyId} refetchContacts={refetchContacts} />
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="text-destructive">*</span> Required fields
            </p>
            <div className="flex flex-wrap items-center gap-3 sm:justify-end">
              {showAutoFill && (
                <Button type="button" variant="outline" onClick={handleDevAutoFill} disabled={isSubmitting || isAutoFilling}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {isAutoFilling ? "Filling..." : "Auto-fill"}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "edit" ? "Saving..." : "Creating..."}
                  </>
                ) : mode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Create Subcontract"
                )}
              </Button>
            </div>
          </div>
        </div>

        <CreateBudgetCodeModal
          open={showCreateBudgetCodeModal}
          onOpenChange={setShowCreateBudgetCodeModal}
          projectId={projectId}
          budgetCodes={budgetCodes}
          onBudgetCodeCreated={(bc) => setBudgetCodes((prev) => [...prev, bc])}
          sovLines={sovLines}
          accountingMethod={accountingMethod}
          onSovLinesChange={setSovLines}
        />
      </form>
    </FormProvider>
  );
}
