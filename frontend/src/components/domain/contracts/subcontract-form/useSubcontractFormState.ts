"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateSubcontractSchema,
  type CreateSubcontractInput,
  type SovLineItem,
  AccountingMethodValues,
} from "@/lib/schemas/create-subcontract-schema";
import { useProjectUsers } from "@/hooks/use-project-users";
import { useCompanyContacts } from "@/hooks/use-company-contacts";
import type { BudgetCode, VendorOption, AttachmentItem } from "./types";

interface UseSubcontractFormStateOptions {
  projectId: number;
  initialData?: Partial<CreateSubcontractInput> & { sovLines?: SovLineItem[] };
  mode: "create" | "edit";
}

function buildDefaults(initialData?: Partial<CreateSubcontractInput>) {
  return {
    contractNumber: initialData?.contractNumber || "",
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
  } satisfies CreateSubcontractInput;
}

export function useSubcontractFormState({
  projectId,
  initialData,
  mode,
}: UseSubcontractFormStateOptions) {
  // --- Core form state ---
  const [sovLines, setSovLines] = React.useState<SovLineItem[]>(
    initialData?.sovLines || [],
  );
  const [attachments, setAttachments] = React.useState<AttachmentItem[]>(
    (initialData?.attachments || []).map((a) => ({
      name: a.name,
      size: a.size ?? 0,
      type: a.type ?? "",
    })),
  );
  const [pendingAttachmentFiles, setPendingAttachmentFiles] = React.useState<File[]>([]);
  const [budgetCodes, setBudgetCodes] = React.useState<BudgetCode[]>([]);
  const [loadingBudgetCodes, setLoadingBudgetCodes] = React.useState(true);
  const [vendorOptions, setVendorOptions] = React.useState<VendorOption[]>([]);
  const [isLoadingVendors, setIsLoadingVendors] = React.useState(true);

  // --- RHF ---
  const methods = useForm<CreateSubcontractInput>({
    resolver: zodResolver(CreateSubcontractSchema) as never,
    reValidateMode: "onBlur",
    defaultValues: buildDefaults(initialData),
  });
  const { setValue, control, reset } = methods;
  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });
  const accountingMethod = useWatch({ control, name: "accountingMethod" });

  // --- Fetch vendors ---
  React.useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoadingVendors(true);
        const response = await fetch(`/api/projects/${projectId}/vendors`);
        if (!response.ok) throw new Error("Failed to load vendors");
        const data = (await response.json()) as Array<{
          id: string;
          vendor_name: string;
          company_id?: string | null;
        }>;
        setVendorOptions(
          (data || []).map((v) => ({
            value: v.id,
            label: v.vendor_name,
            companyId: v.company_id ?? null,
          })),
        );
      } catch {
        setVendorOptions([]);
      } finally {
        setIsLoadingVendors(false);
      }
    };
    fetchVendors();
  }, [projectId]);

  // --- Project users ---
  const { users: projectUsers, isLoading: isLoadingUsers } = useProjectUsers(
    String(projectId),
  );
  const userOptions = React.useMemo(
    () =>
      projectUsers.map((user) => ({
        value: user.id,
        label:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email ||
          "Unknown User",
      })),
    [projectUsers],
  );

  // --- Invoice contacts ---
  const selectedVendor = React.useMemo(
    () => vendorOptions.find((o) => o.value === contractCompanyId),
    [vendorOptions, contractCompanyId],
  );
  const selectedVendorCompanyId = selectedVendor?.companyId ?? null;
  const { options: invoiceContactOptions, isLoading: isLoadingContacts } =
    useCompanyContacts({
      companyId: selectedVendorCompanyId ?? undefined,
      enabled: !!selectedVendorCompanyId,
    });

  React.useEffect(() => {
    if (!contractCompanyId) setValue("invoiceContactIds", []);
  }, [contractCompanyId, setValue]);

  // --- Reset on edit ---
  React.useEffect(() => {
    if (mode !== "edit" || !initialData) return;
    reset(buildDefaults(initialData));
    setSovLines(initialData.sovLines || []);
    setAttachments(
      (initialData.attachments || []).map((a) => ({
        name: a.name,
        size: a.size ?? 0,
        type: a.type ?? "",
      })),
    );
  }, [initialData, mode, reset]);

  // --- Fetch budget codes ---
  React.useEffect(() => {
    const fetchBudgetCodes = async () => {
      if (!projectId) return;
      try {
        setLoadingBudgetCodes(true);
        const response = await fetch(`/api/projects/${projectId}/budget-codes`);
        if (!response.ok) throw new Error("Failed to load budget codes");
        const data = (await response.json()) as { budgetCodes: BudgetCode[] };
        setBudgetCodes(data.budgetCodes || []);
      } catch {
        setBudgetCodes([]);
      } finally {
        setLoadingBudgetCodes(false);
      }
    };
    fetchBudgetCodes();
  }, [projectId]);

  // --- Sync attachments from initialData ---
  React.useEffect(() => {
    if (!initialData?.attachments) return;
    setAttachments(
      initialData.attachments.map((a) => ({
        name: a.name,
        size: a.size ?? 0,
        type: a.type ?? "",
      })),
    );
  }, [initialData?.attachments]);

  // --- Reconcile SOV budget codes ---
  React.useEffect(() => {
    if (budgetCodes.length === 0) return;
    setSovLines((prevLines) => {
      let changed = false;
      const nextLines = prevLines.map((line) => {
        if (line.isGroup || (line.budgetCodeId && line.budgetCodeLabel)) return line;
        const storedCode = `${line.budgetCode ?? ""}`.trim();
        if (!storedCode) return line;
        const matched = budgetCodes.find(
          (c) => c.id === storedCode || c.code === storedCode || c.fullLabel === storedCode,
        );
        if (!matched) return line;
        changed = true;
        return { ...line, budgetCodeId: matched.id, budgetCode: matched.code, budgetCodeLabel: matched.fullLabel };
      });
      return changed ? nextLines : prevLines;
    });
  }, [budgetCodes]);

  // --- Add synthetic budget codes from SOV ---
  React.useEffect(() => {
    const existing = new Set(budgetCodes.flatMap((c) => [c.id, c.code, c.fullLabel]));
    const synthetic: BudgetCode[] = [];
    for (const line of sovLines) {
      if (line.isGroup) continue;
      const code = `${line.budgetCode ?? ""}`.trim();
      if (!code || existing.has(code)) continue;
      existing.add(code);
      synthetic.push({ id: code, code, costType: null, description: "", fullLabel: code });
    }
    if (synthetic.length > 0) setBudgetCodes((prev) => [...prev, ...synthetic]);
  }, [budgetCodes, sovLines]);

  // --- Seed initial SOV line ---
  React.useEffect(() => {
    if (sovLines.length > 0) return;
    const isUnitQuantity = accountingMethod === "unit_quantity";
    setSovLines([
      {
        lineNumber: 1,
        budgetCodeId: "",
        budgetCodeLabel: "",
        description: "",
        amount: 0,
        quantity: 1,
        unitCost: isUnitQuantity ? 0 : undefined,
        unitOfMeasure: isUnitQuantity ? "" : undefined,
        billedToDate: 0,
      } as SovLineItem,
    ]);
  }, [sovLines.length, accountingMethod]);

  // --- Accounting method toggle ---
  const toggleAccountingMethod = React.useCallback(() => {
    const nextMethod =
      accountingMethod === "unit_quantity" ? "amount_based" : "unit_quantity";
    const updatedItems = sovLines.map((item) => {
      if (item.isGroup) return item;
      if (nextMethod === "unit_quantity") {
        const quantity = item.quantity ?? 1;
        let unitCost = item.unitCost;
        if (unitCost === undefined || unitCost === null) {
          unitCost = (item.amount || 0) / quantity;
        }
        return { ...item, quantity, unitCost, unitOfMeasure: item.unitOfMeasure || "", amount: quantity * unitCost };
      }
      const amount = (item.quantity ?? 1) * (item.unitCost ?? 0);
      return { ...item, amount: amount || item.amount || 0, quantity: item.quantity, unitCost: item.unitCost, unitOfMeasure: item.unitOfMeasure };
    });
    setValue("accountingMethod", nextMethod as (typeof AccountingMethodValues)[number]);
    setSovLines(updatedItems);
  }, [accountingMethod, sovLines, setValue]);

  // --- Attachment handlers ---
  const handleAttachmentListChange = React.useCallback(
    (nextAttachments: Array<{ name: string; size: number; type: string; url?: string }>) => {
      setAttachments(nextAttachments);
      setPendingAttachmentFiles((prev) =>
        prev.filter((file) => nextAttachments.some((a) => a.name === file.name && a.size === file.size)),
      );
    },
    [],
  );

  const handleFilesSelected = React.useCallback((selectedFiles: File[]) => {
    setPendingAttachmentFiles((prev) => {
      const next = [...prev];
      for (const file of selectedFiles) {
        if (!next.some((c) => c.name === file.name && c.size === file.size && c.lastModified === file.lastModified)) {
          next.push(file);
        }
      }
      return next;
    });
  }, []);

  return {
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
    handleAttachmentListChange,
    handleFilesSelected,
  };
}
