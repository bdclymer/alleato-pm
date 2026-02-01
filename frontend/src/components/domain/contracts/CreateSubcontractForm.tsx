"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import {
  CreateSubcontractSchema,
  type CreateSubcontractInput,
  type SovLineItem,
} from "@/lib/schemas/create-subcontract-schema";
import { generateAutofillData } from "@/lib/utils/autofill-subcontract";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { RichTextField } from "@/components/forms/RichTextField";
import { CostCodeSelector } from "./CostCodeSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCompanies } from "@/hooks/use-companies";

interface CreateSubcontractFormProps {
  projectId: number;
  onSubmit: (data: CreateSubcontractInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<CreateSubcontractInput> & {
    sovLines?: SovLineItem[];
  };
  mode?: "create" | "edit";
}

export function CreateSubcontractForm({
  onSubmit,
  onCancel,
  initialData,
  mode = "create",
}: CreateSubcontractFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [errorDetails, setErrorDetails] = React.useState<unknown>(null);
  const [sovLines, setSovLines] = React.useState<SovLineItem[]>(
    initialData?.sovLines || [],
  );
  const [attachments, setAttachments] = React.useState<
    Array<{ name: string; size: number; type: string }>
  >([]);

  // Use the companies hook - returns { value: uuid, label: name } options
  const { options: companyOptions, isLoading: isLoadingCompanies } =
    useCompanies();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateSubcontractInput>({
    resolver: zodResolver(CreateSubcontractSchema) as any,
    defaultValues: {
      contractNumber: initialData?.contractNumber || "SC-002",
      status: initialData?.status || "Draft",
      executed: initialData?.executed || false,
      sov: initialData?.sov || [],
      privacy: initialData?.privacy || {
        isPrivate: true,
        allowNonAdminViewSovItems: false,
      },
      title: initialData?.title || "",
      contractCompanyId: initialData?.contractCompanyId || "",
      description: initialData?.description || "",
      inclusions: initialData?.inclusions || "",
      exclusions: initialData?.exclusions || "",
      defaultRetainagePercent: initialData?.defaultRetainagePercent,
      dates: initialData?.dates,
    },
  });

  const contractCompanyId = watch("contractCompanyId");
  const privacyIsPrivate = watch("privacy.isPrivate") ?? true;

  const handleAutofill = () => {
    const autofillData = generateAutofillData();

    // Set all form fields
    setValue("contractNumber", autofillData.contractNumber || "");
    setValue("contractCompanyId", autofillData.contractCompanyId || "");
    setValue("title", autofillData.title || "");
    setValue("status", autofillData.status || "Draft");
    setValue("executed", autofillData.executed || false);
    setValue("defaultRetainagePercent", autofillData.defaultRetainagePercent);
    setValue("description", autofillData.description || "");
    setValue("inclusions", autofillData.inclusions || "");
    setValue("exclusions", autofillData.exclusions || "");

    // Set dates
    if (autofillData.dates) {
      setValue("dates.startDate", autofillData.dates.startDate || "");
      setValue(
        "dates.estimatedCompletionDate",
        autofillData.dates.estimatedCompletionDate || "",
      );
      setValue(
        "dates.actualCompletionDate",
        autofillData.dates.actualCompletionDate || "",
      );
      setValue("dates.contractDate", autofillData.dates.contractDate || "");
      setValue(
        "dates.signedContractReceivedDate",
        autofillData.dates.signedContractReceivedDate || "",
      );
      setValue("dates.issuedOnDate", autofillData.dates.issuedOnDate || "");
    }

    // Set privacy
    if (autofillData.privacy) {
      setValue("privacy.isPrivate", autofillData.privacy.isPrivate || false);
      setValue(
        "privacy.allowNonAdminViewSovItems",
        autofillData.privacy.allowNonAdminViewSovItems || false,
      );
    }

    // Set SOV lines
    if (autofillData.sovLines) {
      setSovLines(autofillData.sovLines);
    }
  };

  const handleFormSubmit = async (data: CreateSubcontractInput) => {
    setIsSubmitting(true);
    setSubmitError(null);
    setErrorDetails(null);
    try {
      // Add SOV lines to submission data
      const submitData = {
        ...data,
        sov: sovLines,
      };

      await onSubmit(submitData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setSubmitError(errorMessage);
      setErrorDetails(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSOVLine = () => {
    const newLine: SovLineItem & { _id: string } = {
      _id: `line-${Date.now()}-${Math.random()}`,
      lineNumber: sovLines.length + 1,
      amount: 0,
      billedToDate: 0,
    };
    setSovLines([...sovLines, newLine as SovLineItem]);
  };

  const updateSOVLine = (
    index: number,
    field: keyof SovLineItem,
    value: unknown,
  ) => {
    const updated = [...sovLines];
    updated[index] = { ...updated[index], [field]: value };
    setSovLines(updated);
  };

  const removeSOVLine = (index: number) => {
    setSovLines(sovLines.filter((_, i) => i !== index));
  };

  const calculateSOVTotals = () => {
    const totals = sovLines.reduce(
      (acc, line) => {
        const lineAmount = line.amount || 0;
        const lineBilled = line.billedToDate || 0;
        return {
          amount: acc.amount + lineAmount,
          billedToDate: acc.billedToDate + lineBilled,
        };
      },
      { amount: 0, billedToDate: 0 },
    );
    return {
      ...totals,
      amountRemaining: totals.amount - totals.billedToDate,
    };
  };

  const totals = calculateSOVTotals();

  const handleFormSubmitWrapper = async (data: CreateSubcontractInput) => {
    await handleFormSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmitWrapper)} className="space-y-8">
      {/* Autofill Test Data Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={handleAutofill}
          disabled={isSubmitting}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Autofill Test Data
        </Button>
      </div>

      {/* Error Display */}
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
                      {JSON.stringify(
                        (errorDetails as Record<string, unknown>).details,
                        null,
                        2,
                      )}
                    </pre>
                  </details>
                </div>
              ) : null}
          </AlertDescription>
        </Alert>
      )}

      {/* General Information Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          General Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractNumber">Contract #</Label>
            <Input
              id="contractNumber"
              {...register("contractNumber")}
              disabled={isSubmitting}
            />
            {errors.contractNumber && (
              <p className="text-sm text-red-600">
                {errors.contractNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractCompanyId">
              Contract Company
              <button type="button" className="ml-2 text-xs text-muted-foreground">
                Delete field
              </button>
            </Label>
            <Select
              value={watch("contractCompanyId") || ""}
              onValueChange={(value) => setValue("contractCompanyId", value)}
              disabled={isSubmitting || isLoadingCompanies}
            >
              <SelectTrigger>
                {isLoadingCompanies ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading companies...
                  </span>
                ) : (
                  <SelectValue placeholder="Select company" />
                )}
              </SelectTrigger>
              <SelectContent>
                {companyOptions.length === 0 ? (
                  <SelectItem value="_no_companies" disabled>
                    No companies available
                  </SelectItem>
                ) : (
                  companyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" {...register("title")} disabled={isSubmitting} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status*</Label>
            <Select
              value={watch("status")}
              onValueChange={(value) => setValue("status", value as "Draft")}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultRetainagePercent">Default Retainage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="defaultRetainagePercent"
                type="number"
                step="0.01"
                {...register("defaultRetainagePercent", {
                  valueAsNumber: true,
                })}
                disabled={isSubmitting}
                className="w-full"
              />
              <span className="text-sm text-foreground">%</span>
            </div>
            {errors.defaultRetainagePercent && (
              <p className="text-sm text-red-600">
                {errors.defaultRetainagePercent.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="executed" className="block">
              Executed
            </Label>
            <div className="flex items-center space-x-2 h-9">
              <Checkbox
                id="executed"
                checked={watch("executed")}
                onCheckedChange={(checked) =>
                  setValue("executed", checked as boolean)
                }
                disabled={isSubmitting}
              />
              <Label
                htmlFor="executed"
                className="text-sm font-normal cursor-pointer"
              >
                Mark as Executed*
              </Label>
            </div>
          </div>
        </div>

        <RichTextField
          label="Description"
          value={watch("description")}
          onChange={(val) => setValue("description", val, { shouldDirty: true })}
          disabled={isSubmitting}
          placeholder="Enter description..."
        />
      </section>

      {/* Attachments Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Attachments</h2>

        <FileUploadField
          label=""
          value={attachments}
          onChange={setAttachments}
          multiple
          maxFiles={20}
          maxSize={50 * 1024 * 1024}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          hint="Attach contract documents, plans, or other relevant files"
          disabled={isSubmitting}
        />
      </section>

      {/* Schedule of Values Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Schedule of Values
        </h2>

        {/* SOV Accounting Method Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-900">
              This contract&apos;s default accounting method is amount-based
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              Change to Unit/Quantity
            </Button>
          </div>
        </div>

        {/* SOV Table */}
        {sovLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-muted-foreground">
              {/* Empty state image placeholder */}
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <span className="text-4xl">📊</span>
              </div>
            </div>
            <p className="text-lg font-medium text-foreground">
              You Have No Line Items Yet
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addSOVLine}
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Add Group
              </Button>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Import SOV from CSV
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={addSOVLine}
                size="sm"
                disabled={isSubmitting}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Line
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Add Group
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Import SOV from CSV
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground w-12">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Change Event Line Item
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Budget Code
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-foreground">
                      Description
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Billed to Date
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-foreground">
                      Amount Remaining
                    </th>
                    <th className="px-3 py-2 w-12" aria-label="Actions"></th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y">
                  {sovLines.map((line, index) => (
                    <tr
                      key={
                        (line as SovLineItem & { _id?: string })._id ||
                        `line-${index}`
                      }
                    >
                      <td className="px-3 py-2 text-sm">{index + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm"
                          placeholder="Change Event"
                          value={line.changeEventLineItem || ""}
                          onChange={(e) =>
                            updateSOVLine(
                              index,
                              "changeEventLineItem",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <CostCodeSelector
                          value={line.budgetCode || ""}
                          onChange={(value) =>
                            updateSOVLine(index, "budgetCode", value)
                          }
                          placeholder="Select budget code"
                          className="w-full"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm"
                          placeholder="Description"
                          value={line.description || ""}
                          onChange={(e) =>
                            updateSOVLine(index, "description", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="text-sm text-right"
                          type="number"
                          step="0.01"
                          placeholder="$0.00"
                          value={line.amount || 0}
                          onChange={(e) =>
                            updateSOVLine(
                              index,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        ${(line.billedToDate || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        $
                        {(
                          (line.amount || 0) - (line.billedToDate || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSOVLine(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-sm">
                      Total:
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.amount.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.billedToDate.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right">
                      ${totals.amountRemaining.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Inclusions & Exclusions Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Inclusions & Exclusions
        </h2>

        <div className="space-y-4">
          <RichTextField
            label="Inclusions"
            value={watch("inclusions")}
            onChange={(val) => setValue("inclusions", val, { shouldDirty: true })}
            disabled={isSubmitting}
            placeholder="Enter inclusions..."
          />

          <RichTextField
            label="Exclusions"
            value={watch("exclusions")}
            onChange={(val) => setValue("exclusions", val, { shouldDirty: true })}
            disabled={isSubmitting}
            placeholder="Enter exclusions..."
          />
        </div>
      </section>

      {/* Contract Dates Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Contract Dates</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dates.startDate">Start Date</Label>
            <Input
              id="dates.startDate"
              type="text"
              {...register("dates.startDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.startDate && (
              <p className="text-sm text-red-600">
                {errors.dates.startDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.estimatedCompletionDate">
              Estimated Completion Date
            </Label>
            <Input
              id="dates.estimatedCompletionDate"
              type="text"
              {...register("dates.estimatedCompletionDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.estimatedCompletionDate && (
              <p className="text-sm text-red-600">
                {errors.dates.estimatedCompletionDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.actualCompletionDate">
              Actual Completion Date
            </Label>
            <Input
              id="dates.actualCompletionDate"
              type="text"
              {...register("dates.actualCompletionDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.actualCompletionDate && (
              <p className="text-sm text-red-600">
                {errors.dates.actualCompletionDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.contractDate">Contract Date</Label>
            <Input
              id="dates.contractDate"
              type="text"
              {...register("dates.contractDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.contractDate && (
              <p className="text-sm text-red-600">
                {errors.dates.contractDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.signedContractReceivedDate">
              Signed Contract Received Date
            </Label>
            <Input
              id="dates.signedContractReceivedDate"
              type="text"
              {...register("dates.signedContractReceivedDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.signedContractReceivedDate && (
              <p className="text-sm text-red-600">
                {errors.dates.signedContractReceivedDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dates.issuedOnDate">Issued On Date</Label>
            <Input
              id="dates.issuedOnDate"
              type="text"
              {...register("dates.issuedOnDate")}
              disabled={isSubmitting}
              placeholder="mm/dd/yyyy"
            />
            {errors.dates?.issuedOnDate && (
              <p className="text-sm text-red-600">
                {errors.dates.issuedOnDate.message}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Contract Privacy Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Contract Privacy
        </h2>

        <p className="text-sm text-foreground">
          Using the privacy setting allows only project admins and the select
          non-admin users access.
        </p>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="privacy.isPrivate"
              checked={privacyIsPrivate}
              onCheckedChange={(checked) =>
                setValue("privacy.isPrivate", checked as boolean)
              }
              disabled={isSubmitting}
            />
            <Label htmlFor="privacy.isPrivate" className="text-sm font-normal">
              Private
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacy.nonAdminUserIds">
              Access for Non-Admin Users
              <button type="button" className="ml-2 text-xs text-muted-foreground">
                Delete field
              </button>
            </Label>
            <Input
              id="privacy.nonAdminUserIds"
              disabled={isSubmitting || !privacyIsPrivate}
              placeholder={
                privacyIsPrivate
                  ? "Select users..."
                  : "Enable Private to use this field"
              }
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="privacy.allowNonAdminViewSovItems"
              checked={watch("privacy.allowNonAdminViewSovItems")}
              onCheckedChange={(checked) =>
                setValue(
                  "privacy.allowNonAdminViewSovItems",
                  checked as boolean,
                )
              }
              disabled={isSubmitting || !privacyIsPrivate}
            />
            <Label
              htmlFor="privacy.allowNonAdminViewSovItems"
              className="text-sm font-normal"
            >
              Allow these non-admin users to view the SOV items.
            </Label>
          </div>
        </div>
      </section>

      {/* Invoice Contacts Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Invoice Contacts
        </h2>

        {!contractCompanyId ? (
          <p className="text-sm text-foreground">
            Please select a Contract Company first
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="invoiceContacts">Invoice Contacts</Label>
            <Input
              id="invoiceContacts"
              disabled={isSubmitting}
              placeholder="Select invoice contacts..."
            />
          </div>
        )}
      </section>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <p className="text-sm text-foreground">*Required fields</p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
