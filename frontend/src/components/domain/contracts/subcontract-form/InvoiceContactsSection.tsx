"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

interface InvoiceContactsSectionProps {
  isSubmitting: boolean;
  invoiceContactOptions: Array<{ value: string; label: string }>;
  isLoadingContacts: boolean;
}

export function InvoiceContactsSection({
  isSubmitting,
  invoiceContactOptions,
  isLoadingContacts,
}: InvoiceContactsSectionProps) {
  const { control } = useFormContext<CreateSubcontractInput>();
  const contractCompanyId = useWatch({ control, name: "contractCompanyId" });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Invoice Contacts
      </h2>
      <div>
        {!contractCompanyId ? (
          <p className="text-sm text-muted-foreground">
            Select a vendor above to enable invoice contacts.
          </p>
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
                        ? "No contacts found for this vendor"
                        : "Select contacts who can submit invoices..."
                  }
                />
              )}
            />
          </div>
        )}
      </div>
    </section>
  );
}
