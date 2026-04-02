"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelectField } from "@/components/forms/MultiSelectField";
import type { CreateSubcontractInput } from "@/lib/schemas/create-subcontract-schema";

interface PrivacySectionProps {
  isSubmitting: boolean;
  userOptions: Array<{ value: string; label: string }>;
  isLoadingUsers: boolean;
}

export function PrivacySection({
  isSubmitting,
  userOptions,
  isLoadingUsers,
}: PrivacySectionProps) {
  const { control } = useFormContext<CreateSubcontractInput>();
  const privacyIsPrivate = useWatch({ control, name: "privacy.isPrivate" }) ?? true;

  return (
    <section className="space-y-4 border-b border-border/70 pb-8">
      <h2 className="text-lg font-semibold text-foreground">
        Contract Privacy
      </h2>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Privacy restricts access to project admins and selected non-admin users.
        </p>

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
          <Label
            htmlFor="privacy.isPrivate"
            className="text-sm font-normal"
          >
            Private (default)
          </Label>
        </div>

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
  );
}
