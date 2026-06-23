"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  companySchema,
  type CompanyFormData,
} from "@/lib/schemas/financial-schemas";
import { createCompany, updateCompany } from "@/app/(main)/actions/table-actions";

interface Company {
  id: string;
  name: string;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  license_number: string | null;
  currency_code: string | null;
  currency_symbol: string | null;
  notes: string | null;
}

interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSuccess?: () => void;
  onCreate?: (data: CompanyFormData) => Promise<{ error?: string } | void>;
  onUpdate?: (
    companyId: string,
    data: CompanyFormData,
  ) => Promise<{ error?: string } | void>;
}

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
];

const COMPANY_TYPES = [
  "General Contractor",
  "Subcontractor",
  "Supplier",
  "Owner",
  "Architect",
  "Engineer",
  "Consultant",
  "Developer",
  "Property Manager",
  "Other",
];

export function CompanyFormDialog({
  open,
  onOpenChange,
  company,
  onSuccess,
  onCreate,
  onUpdate,
}: CompanyFormDialogProps) {
  const isEdit = !!company;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    reValidateMode: "onBlur",
    defaultValues: {
      name: company?.name || "",
      title: company?.title || "",
      address: company?.address || "",
      city: company?.city || "",
      state: company?.state || "",
      website: company?.website || "",
      license_number: company?.license_number || "",
      currency_code: company?.currency_code || "USD",
      currency_symbol: company?.currency_symbol || "$",
      notes: company?.notes || "",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: company?.name || "",
        title: company?.title || "",
        address: company?.address || "",
        city: company?.city || "",
        state: company?.state || "",
        website: company?.website || "",
        license_number: company?.license_number || "",
        currency_code: company?.currency_code || "USD",
        currency_symbol: company?.currency_symbol || "$",
        notes: company?.notes || "",
      });
    }
  }, [open, company, form]);

  const handleCurrencyChange = (currencyCode: string) => {
    const currency = CURRENCIES.find((c) => c.code === currencyCode);
    if (currency) {
      form.setValue("currency_code", currency.code);
      form.setValue("currency_symbol", currency.symbol);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...data,
        website: data.website || null,
        license_number: data.license_number || null,
        title: data.title || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
      };

      const updateData = {
        name: cleanData.name,
        website: cleanData.website ?? undefined,
        license_number: cleanData.license_number ?? undefined,
        title: cleanData.title ?? undefined,
        address: cleanData.address ?? undefined,
        city: cleanData.city ?? undefined,
        state: cleanData.state ?? undefined,
        currency_code: cleanData.currency_code,
        currency_symbol: cleanData.currency_symbol,
      };

      const result =
        isEdit && company
          ? onUpdate
            ? await onUpdate(company.id, updateData)
            : await updateCompany(company.id, updateData)
          : onCreate
            ? await onCreate(updateData)
            : await createCompany(updateData);

      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Company updated successfully"
          : "Company created successfully",
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Company" : "Add New Company"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the company information below."
              : "Fill in the details to create a new company."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMPANY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      type="url"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>License Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CGC #1537130" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select
                    onValueChange={handleCurrencyChange}
                    value={field.value || "USD"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this company..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
