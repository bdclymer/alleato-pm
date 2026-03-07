"use client";

import * as React from "react";
import { Loader2, Paperclip, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form } from "@/components/forms/Form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ChangeEventStatus = "open" | "pending" | "close" | "void";
type ChangeEventOrigin = "emails" | "meetings" | "rfis";
type ChangeEventType =
  | "allowance"
  | "contingency"
  | "owner_change"
  | "tbd"
  | "transfer";
type ChangeReason =
  | "allowance"
  | "backcharge"
  | "client_request"
  | "design_development"
  | "existing_condition";

export interface ChangeEventLineItem {
  budgetCode: string;
  description: string;
  vendor: string;
  contract: string;
  revenueUnitOfMeasure: string;
  revenueQuantity: number;
  revenueUnitCost: number;
  revenueRom: number;
  costQuantity: number;
  costUnitCost: number;
  costRom: number;
  nonCommittedCost: number;
}

export interface ChangeEventFormData {
  number?: string;
  contractNumber: string;
  title: string;
  status: ChangeEventStatus | string;
  origin?: ChangeEventOrigin | string;
  type?: ChangeEventType | string;
  changeReason?: ChangeReason | string;
  scope?: string;
  expectingRevenue?: boolean;
  lineItemRevenueSource?: string;
  primeContractId?: string;
  description?: string;
  notes?: string;
  estimatedImpact?: number;
  attachments: File[];
  lineItems: ChangeEventLineItem[];
}

interface ChangeEventFormProps {
  initialData?: Partial<ChangeEventFormData>;
  onSubmit: (data: ChangeEventFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: "create" | "edit";
  projectId: number;
}

interface PrimeContractOption {
  value: string;
  label: string;
}

const createEmptyLineItem = (): ChangeEventLineItem => ({
  budgetCode: "",
  description: "",
  vendor: "",
  contract: "",
  revenueUnitOfMeasure: "",
  revenueQuantity: 0,
  revenueUnitCost: 0,
  revenueRom: 0,
  costQuantity: 0,
  costUnitCost: 0,
  costRom: 0,
  nonCommittedCost: 0,
});

export function ChangeEventForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = "create",
  projectId,
}: ChangeEventFormProps) {
  const [formData, setFormData] = React.useState<ChangeEventFormData>({
    contractNumber: initialData?.contractNumber || initialData?.number || "",
    title: initialData?.title || "",
    status: initialData?.status || "open",
    origin: initialData?.origin,
    type: initialData?.type,
    changeReason: initialData?.changeReason,
    scope: initialData?.scope || "",
    expectingRevenue: initialData?.expectingRevenue ?? true,
    lineItemRevenueSource: initialData?.lineItemRevenueSource || "",
    primeContractId: initialData?.primeContractId || "",
    description: initialData?.description || "",
    attachments: initialData?.attachments || [],
    lineItems:
      initialData?.lineItems && initialData.lineItems.length > 0
        ? initialData.lineItems
        : [createEmptyLineItem()],
  });

  const [errors, setErrors] = React.useState<
    Partial<Record<keyof ChangeEventFormData, string>>
  >({});
  const [primeContractOptions, setPrimeContractOptions] = React.useState<
    PrimeContractOption[]
  >([]);

  React.useEffect(() => {
    const fetchPrimeContracts = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/prime-contracts`);
        if (!response.ok) return;
        const payload = await response.json();
        const records = (payload.data || payload || []) as Array<{
          id: number | string;
          contract_number?: string;
          number?: string;
          title?: string;
          description?: string;
        }>;
        setPrimeContractOptions(
          records.map((record) => ({
            value: String(record.id),
            label: `${record.contract_number || record.number || "PC"} - ${record.title || record.description || "Untitled"}`,
          })),
        );
      } catch {
        setPrimeContractOptions([]);
      }
    };

    fetchPrimeContracts();
  }, [projectId]);

  const updateFormData = (updates: Partial<ChangeEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setErrors((prev) => {
      const next = { ...prev };
      (Object.keys(updates) as Array<keyof ChangeEventFormData>).forEach(
        (key) => {
          delete next[key];
        },
      );
      return next;
    });
  };

  const updateLineItem = (
    index: number,
    key: keyof ChangeEventLineItem,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const nextItems = [...prev.lineItems];
      const current = { ...nextItems[index], [key]: value };

      if (key === "revenueQuantity" || key === "revenueUnitCost") {
        current.revenueRom =
          Number(current.revenueQuantity || 0) * Number(current.revenueUnitCost || 0);
      }
      if (key === "costQuantity" || key === "costUnitCost") {
        current.costRom =
          Number(current.costQuantity || 0) * Number(current.costUnitCost || 0);
      }

      nextItems[index] = current;
      return { ...prev, lineItems: nextItems };
    });
  };

  const addLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, createEmptyLineItem()],
    }));
  };

  const removeLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems:
        prev.lineItems.length > 1
          ? prev.lineItems.filter((_, i) => i !== index)
          : [createEmptyLineItem()],
    }));
  };

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...Array.from(files)],
    }));
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ChangeEventFormData, string>> = {};

    if (!formData.contractNumber.trim()) {
      nextErrors.contractNumber = "Contract number is required";
    }
    if (!formData.title.trim()) {
      nextErrors.title = "Title is required";
    }
    if (!formData.status) {
      nextErrors.status = "Status is required";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <Form
      onSubmit={handleSubmit}
      data-dev-autofill-disabled="true"
      data-form-id="change-event-create"
    >
      <div className="space-y-12 rounded-sm p-6 lg:p-8">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-primary">
              General Information
            </h2>
            <div className="h-px flex-1 bg-primary" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contractNumber">
                Contract Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contractNumber"
                value={formData.contractNumber}
                onChange={(e) => updateFormData({ contractNumber: e.target.value })}
                placeholder="Enter contract number"
              />
              {errors.contractNumber && (
                <p className="text-sm text-destructive">{errors.contractNumber}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder="Enter title"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  updateFormData({ status: value as ChangeEventStatus })
                }
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="close">Close</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Select
                value={formData.origin || ""}
                onValueChange={(value) =>
                  updateFormData({ origin: value as ChangeEventOrigin })
                }
              >
                <SelectTrigger id="origin" className="w-full">
                  <SelectValue placeholder="Select Origin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emails">Emails</SelectItem>
                  <SelectItem value="meetings">Meetings</SelectItem>
                  <SelectItem value="rfis">RFI&apos;s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type || ""}
                onValueChange={(value) =>
                  updateFormData({ type: value as ChangeEventType })
                }
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowance">Allowance</SelectItem>
                  <SelectItem value="contingency">Contingency</SelectItem>
                  <SelectItem value="owner_change">Owner Change</SelectItem>
                  <SelectItem value="tbd">TBD</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="changeReason">Change Reason</Label>
              <Select
                value={formData.changeReason || ""}
                onValueChange={(value) =>
                  updateFormData({ changeReason: value as ChangeReason })
                }
              >
                <SelectTrigger id="changeReason" className="w-full">
                  <SelectValue placeholder="Select Change Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="allowance">Allowance</SelectItem>
                  <SelectItem value="backcharge">Backcharge</SelectItem>
                  <SelectItem value="client_request">Client Request</SelectItem>
                  <SelectItem value="design_development">Design Development</SelectItem>
                  <SelectItem value="existing_condition">Existing Condition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope</Label>
              <Select
                value={formData.scope || ""}
                onValueChange={(value) => updateFormData({ scope: value })}
              >
                <SelectTrigger id="scope" className="w-full">
                  <SelectValue placeholder="Select Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Scope">In Scope</SelectItem>
                  <SelectItem value="Out of Scope">Out of Scope</SelectItem>
                  <SelectItem value="To Be Determined">To Be Determined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expectingRevenue">Expecting Revenue</Label>
              <div className="flex h-10 items-center gap-2">
                <Checkbox
                  id="expectingRevenue"
                  checked={!!formData.expectingRevenue}
                  onCheckedChange={(checked) =>
                    updateFormData({ expectingRevenue: checked === true })
                  }
                />
                <Label htmlFor="expectingRevenue" className="text-sm font-normal">
                  Enable revenue fields
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineItemRevenueSource">Line Item Revenue Source</Label>
              <Select
                value={formData.lineItemRevenueSource || ""}
                onValueChange={(value) =>
                  updateFormData({ lineItemRevenueSource: value })
                }
              >
                <SelectTrigger id="lineItemRevenueSource" className="w-full">
                  <SelectValue placeholder="Select Revenue Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match_latest_cost">Match Latest Cost</SelectItem>
                  <SelectItem value="latest_cost">Latest Cost</SelectItem>
                  <SelectItem value="latest_price">Latest Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primeContractId">Prime Contract For Markup Estimates</Label>
              <Select
                value={formData.primeContractId || ""}
                onValueChange={(value) => updateFormData({ primeContractId: value })}
              >
                <SelectTrigger id="primeContractId" className="w-full">
                  <SelectValue placeholder="Select Prime Contract" />
                </SelectTrigger>
                <SelectContent>
                  {primeContractOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No prime contracts available
                    </SelectItem>
                  ) : (
                    primeContractOptions.map((option) => (
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formData.description || ""}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Describe the change event"
            />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-primary">
              Line Items
            </h2>
            <div className="h-px flex-1 bg-primary" />
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-max w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  <th colSpan={4} className="px-3 py-2 text-left text-sm">
                    Detail
                  </th>
                  <th colSpan={4} className="px-3 py-2 text-left text-sm">
                    Revenue
                  </th>
                  <th colSpan={4} className="px-3 py-2 text-left text-sm">
                    Cost
                  </th>
                  <th className="px-3 py-2 text-left text-sm"> </th>
                </tr>
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Budget code</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Description</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Vendor</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Contract</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Unit of measure</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Quantity</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Unit cost</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Revenue ROM</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Quantity</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Unit cost</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Cost ROM</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground">Non-committed cost</th>
                  <th className="px-3 py-2 text-left text-[11px] font-normal text-muted-foreground"> </th>
                </tr>
              </thead>
              <tbody>
                {formData.lineItems.map((item, index) => (
                  <tr key={`line-item-${index}`}>
                    <td className="p-2">
                      <Input
                        value={item.budgetCode}
                        onChange={(e) =>
                          updateLineItem(index, "budgetCode", e.target.value)
                        }
                        placeholder="Budget code"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(index, "description", e.target.value)
                        }
                        placeholder="Description"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.vendor}
                        onChange={(e) => updateLineItem(index, "vendor", e.target.value)}
                        placeholder="Vendor"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.contract}
                        onChange={(e) =>
                          updateLineItem(index, "contract", e.target.value)
                        }
                        placeholder="Contract"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={item.revenueUnitOfMeasure}
                        onChange={(e) =>
                          updateLineItem(index, "revenueUnitOfMeasure", e.target.value)
                        }
                        placeholder="UOM"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.revenueQuantity}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "revenueQuantity",
                            Number(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.revenueUnitCost}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "revenueUnitCost",
                            Number(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.revenueRom}
                        onChange={(e) =>
                          updateLineItem(index, "revenueRom", Number(e.target.value) || 0)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.costQuantity}
                        onChange={(e) =>
                          updateLineItem(index, "costQuantity", Number(e.target.value) || 0)
                        }
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.costUnitCost}
                        onChange={(e) =>
                          updateLineItem(index, "costUnitCost", Number(e.target.value) || 0)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.costRom}
                        onChange={(e) =>
                          updateLineItem(index, "costRom", Number(e.target.value) || 0)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.nonCommittedCost}
                        onChange={(e) =>
                          updateLineItem(
                            index,
                            "nonCommittedCost",
                            Number(e.target.value) || 0,
                          )
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        disabled={formData.lineItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" onClick={addLineItem}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line Item
          </Button>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.08em] text-primary">
              Attachments
            </h2>
            <div className="h-px flex-1 bg-primary" />
          </div>

          <div className="rounded-lg border border-dashed p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              <Label
                htmlFor="attachments"
                className="cursor-pointer rounded-md border bg-muted px-3 py-2 text-sm"
              >
                Attach Files
              </Label>
              <p className="text-sm text-muted-foreground">or Drag & Drop</p>
              <Input
                id="attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addAttachments(e.target.files)}
              />
            </div>
          </div>

          {formData.attachments.length > 0 && (
            <div className="space-y-2">
              {formData.attachments.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="truncate text-sm">{file.name}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttachment(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="sticky bottom-0 -mx-6 mt-10 flex items-center justify-between gap-4 border-t bg-card/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
          <p className="text-sm text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="change-event-submit-button"
            >
              {isSubmitting ? (
                <>
                  <span className="mr-2">Saving...</span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : mode === "create" ? (
                "Create Change Event"
              ) : (
                "Update Change Event"
              )}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}
