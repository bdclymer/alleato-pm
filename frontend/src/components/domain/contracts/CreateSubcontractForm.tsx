"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
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
import { X, Plus, Sparkles, AlertCircle, Loader2, Info } from "lucide-react";
import {
  CreateSubcontractSchema,
  type CreateSubcontractInput,
  type SovLineItem,
  CommitmentStatusValues,
  AccountingMethodValues,
} from "@/lib/schemas/create-subcontract-schema";
import { generateAutofillData } from "@/lib/utils/autofill-subcontract";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { RichTextField } from "@/components/forms/RichTextField";
import { DateField } from "@/components/forms/DateField";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import { CostCodeSelector } from "./CostCodeSelector";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCompanies } from "@/hooks/use-companies";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useCompanyContacts } from "@/hooks/use-company-contacts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  projectId,
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

  // Use the companies hook
  const { options: companyOptions, isLoading: isLoadingCompanies } =
    useCompanies();

  // Use project users hook for non-admin user selection
  const { users: projectUsers, isLoading: isLoadingUsers } = useProjectUsers(
    String(projectId),
  );

  // Transform project users to options for multi-select
  const userOptions = React.useMemo(() => {
    return projectUsers.map((user) => ({
      value: user.id,
      label: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "Unknown User",
    }));
  }, [projectUsers]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<CreateSubcontractInput>({
    resolver: zodResolver(CreateSubcontractSchema) as never,
    defaultValues: {
      contractNumber: initialData?.contractNumber || "SC-002",
      status: initialData?.status || "Draft",
      executed: initialData?.executed ?? false,
      accountingMethod: initialData?.accountingMethod || "amount_based",
      sov: initialData?.sov || [],
      privacy: initialData?.privacy || {
        isPrivate: true,
        nonAdminUserIds: [],
        allowNonAdminViewSovItems: false,
      },
      title: initialData?.title || "",
      contractCompanyId: initialData?.contractCompanyId || "",
      description: initialData?.description || "",
      inclusions: initialData?.inclusions || "",
      exclusions: initialData?.exclusions || "",
      defaultRetainagePercent: initialData?.defaultRetainagePercent,
      dates: initialData?.dates || {
        startDate: undefined,
        estimatedCompletionDate: undefined,
        actualCompletionDate: undefined,
        contractDate: undefined,
        signedContractReceivedDate: undefined,
        issuedOnDate: undefined,
      },
      invoiceContactIds: initialData?.invoiceContactIds || [],
      attachments: [],
    },
  });

  const contractCompanyId = watch("contractCompanyId");
  const privacyIsPrivate = watch("privacy.isPrivate") ?? true;
  const accountingMethod = watch("accountingMethod");

  // Fetch company contacts when a company is selected
  const { options: invoiceContactOptions, isLoading: isLoadingContacts } =
    useCompanyContacts({
      companyId: contractCompanyId,
      enabled: !!contractCompanyId,
    });

  // Clear invoice contacts when company changes
  React.useEffect(() => {
    if (!contractCompanyId) {
      setValue("invoiceContactIds", []);
    }
  }, [contractCompanyId, setValue]);

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
      setValue("dates.startDate", autofillData.dates.startDate || undefined);
      setValue(
        "dates.estimatedCompletionDate",
        autofillData.dates.estimatedCompletionDate || undefined,
      );
      setValue(
        "dates.actualCompletionDate",
        autofillData.dates.actualCompletionDate || undefined,
      );
      setValue("dates.contractDate", autofillData.dates.contractDate || undefined);
      setValue(
        "dates.signedContractReceivedDate",
        autofillData.dates.signedContractReceivedDate || undefined,
      );
      setValue("dates.issuedOnDate", autofillData.dates.issuedOnDate || undefined);
    }

    // Set privacy
    if (autofillData.privacy) {
      setValue("privacy.isPrivate", autofillData.privacy.isPrivate ?? true);
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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
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
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              {...register("title")}
              disabled={isSubmitting}
              placeholder="Enter contract title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractNumber">
              Contract # <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contractNumber"
              {...register("contractNumber")}
              disabled={isSubmitting}
            />
            {errors.contractNumber && (
              <p className="text-sm text-destructive">
                {errors.contractNumber.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractCompanyId">
              Contract Company <span className="text-destructive">*</span>
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
            {errors.contractCompanyId && (
              <p className="text-sm text-destructive">
                {errors.contractCompanyId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={watch("status")}
              onValueChange={(value) =>
                setValue("status", value as (typeof CommitmentStatusValues)[number])
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CommitmentStatusValues.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defaultRetainagePercent">Default Retainage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="defaultRetainagePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register("defaultRetainagePercent", {
                  valueAsNumber: true,
                })}
                disabled={isSubmitting}
                className="w-full"
                placeholder="0.00"
              />
              <span className="text-sm text-foreground">%</span>
            </div>
            {errors.defaultRetainagePercent && (
              <p className="text-sm text-destructive">
                {errors.defaultRetainagePercent.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountingMethod">Accounting Method</Label>
            <Select
              value={accountingMethod}
              onValueChange={(value) =>
                setValue(
                  "accountingMethod",
                  value as (typeof AccountingMethodValues)[number],
                )
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount_based">Amount-based</SelectItem>
                <SelectItem value="unit_quantity">Unit/Quantity</SelectItem>
              </SelectContent>
            </Select>
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
                Mark as Executed
              </Label>
            </div>
          </div>
        </div>

        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextField
              label="Description"
              value={field.value || ""}
              onChange={field.onChange}
              disabled={isSubmitting}
              placeholder="Enter detailed contract description..."
            />
          )}
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
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 dark:bg-blue-950 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              This contract&apos;s accounting method is{" "}
              <strong>
                {accountingMethod === "amount_based"
                  ? "amount-based"
                  : "unit/quantity"}
              </strong>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() =>
                setValue(
                  "accountingMethod",
                  accountingMethod === "amount_based"
                    ? "unit_quantity"
                    : "amount_based",
                )
              }
            >
              Change to{" "}
              {accountingMethod === "amount_based"
                ? "Unit/Quantity"
                : "Amount-based"}
            </Button>
          </div>
        </div>

        {/* SOV Table */}
        {sovLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-muted-foreground">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <span className="text-4xl">📊</span>
              </div>
            </div>
            <p className="text-lg font-medium text-foreground">
              You Have No Line Items Yet
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={addSOVLine} disabled={isSubmitting}>
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
          <Controller
            name="inclusions"
            control={control}
            render={({ field }) => (
              <RichTextField
                label="Inclusions"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={isSubmitting}
                placeholder="Enter scope inclusions..."
              />
            )}
          />

          <Controller
            name="exclusions"
            control={control}
            render={({ field }) => (
              <RichTextField
                label="Exclusions"
                value={field.value || ""}
                onChange={field.onChange}
                disabled={isSubmitting}
                placeholder="Enter scope exclusions..."
              />
            )}
          />
        </div>
      </section>

      {/* Contract Dates Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Contract Dates</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Controller
            name="dates.startDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Start Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select start date"
                error={errors.dates?.startDate?.message}
              />
            )}
          />

          <Controller
            name="dates.estimatedCompletionDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Estimated Completion Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select estimated completion"
                error={errors.dates?.estimatedCompletionDate?.message}
              />
            )}
          />

          <Controller
            name="dates.actualCompletionDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Actual Completion Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select actual completion"
                error={errors.dates?.actualCompletionDate?.message}
              />
            )}
          />

          <Controller
            name="dates.contractDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Contract Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select contract date"
                error={errors.dates?.contractDate?.message}
              />
            )}
          />

          <Controller
            name="dates.signedContractReceivedDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Signed Contract Received Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select signed contract received"
                error={errors.dates?.signedContractReceivedDate?.message}
              />
            )}
          />

          <Controller
            name="dates.issuedOnDate"
            control={control}
            render={({ field }) => (
              <DateField
                label="Issued On Date"
                value={field.value instanceof Date ? field.value : undefined}
                onChange={(date) => field.onChange(date)}
                disabled={isSubmitting}
                placeholder="Select issued on date"
                error={errors.dates?.issuedOnDate?.message}
              />
            )}
          />
        </div>
      </section>

      {/* Contract Privacy Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">
          Contract Privacy
        </h2>

        <div className="bg-muted/50 rounded-md p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Using the privacy setting restricts access to only project admins
              and the select non-admin users specified below.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Controller
              name="privacy.isPrivate"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="privacy.isPrivate"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  disabled={isSubmitting}
                />
              )}
            />
            <Label htmlFor="privacy.isPrivate" className="text-sm font-normal">
              Private (default)
            </Label>
          </div>

          {/* Non-Admin Users Access - Only shown when Private is checked */}
          {privacyIsPrivate && (
            <>
              <div className="space-y-2">
                <Label>Access for Non-Admin Users</Label>
                <Controller
                  name="privacy.nonAdminUserIds"
                  control={control}
                  render={({ field }) => (
                    <MultiSelectField
                      label=""
                      options={userOptions}
                      value={field.value || []}
                      onChange={(values) => field.onChange(values)}
                      disabled={isSubmitting || isLoadingUsers}
                      placeholder={
                        isLoadingUsers
                          ? "Loading users..."
                          : "Select users who can access this contract..."
                      }
                    />
                  )}
                />
                <p className="text-sm text-muted-foreground">
                  These non-admin users will have access to view this contract.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Controller
                  name="privacy.allowNonAdminViewSovItems"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="privacy.allowNonAdminViewSovItems"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      disabled={isSubmitting}
                    />
                  )}
                />
                <Label
                  htmlFor="privacy.allowNonAdminViewSovItems"
                  className="text-sm font-normal"
                >
                  Allow these non-admin users to view the SOV items
                </Label>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Invoice Contacts Section - Conditional on Company Selection */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Invoice Contacts</h2>

        {!contractCompanyId ? (
          <div className="bg-muted/50 rounded-md p-4">
            <p className="text-sm text-muted-foreground">
              Please select a Contract Company first to enable invoice contacts
              selection.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Controller
              name="invoiceContactIds"
              control={control}
              render={({ field }) => (
                <MultiSelectField
                  label="Invoice Contacts"
                  options={invoiceContactOptions}
                  value={field.value || []}
                  onChange={(values) => field.onChange(values)}
                  disabled={isSubmitting || isLoadingContacts}
                  placeholder={
                    isLoadingContacts
                      ? "Loading contacts..."
                      : invoiceContactOptions.length === 0
                        ? "No contacts found for this company"
                        : "Select contacts who can submit invoices..."
                  }
                  hint="These contacts will be able to submit invoices for this contract."
                />
              )}
            />
          </div>
        )}
      </section>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <p className="text-sm text-muted-foreground">
          <span className="text-destructive">*</span> Required fields
        </p>
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
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "edit" ? "Saving..." : "Creating..."}
              </>
            ) : mode === "edit" ? (
              "Save Changes"
            ) : (
              "Create"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
