"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export interface InvoicingSettings {
  id: number | null;
  project_id: number;
  default_billing_start_day: number;
  default_billing_end_day: number;
  default_billing_due_day: number;
  default_retainage_percent: number;
  allow_over_billing: boolean;
  notify_subs_on_approval: boolean;
  send_under_review_digest: boolean;
  invite_reminder_frequency_days: number;
  invoice_pdf_footer_text: string;
  invitation_custom_message: string;
  created_at: string | null;
  updated_at: string | null;
}

export type UpdateInvoicingSettingsInput = Partial<
  Omit<InvoicingSettings, "id" | "project_id" | "created_at" | "updated_at">
>;

interface InvoicingSettingsApiResponse {
  data: InvoicingSettings;
}

export const invoicingSettingsKeys = {
  all: ["invoicing-settings"] as const,
  detail: (projectId: string) =>
    [...invoicingSettingsKeys.all, projectId] as const,
};

export function useInvoicingSettings(projectId: string) {
  return useQuery<InvoicingSettings>({
    queryKey: invoicingSettingsKeys.detail(projectId),
    queryFn: async () => {
      const payload = await apiFetch<InvoicingSettingsApiResponse>(
        `/api/projects/${projectId}/invoicing/settings`,
      );
      return payload.data as InvoicingSettings;
    },
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateInvoicingSettings(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateInvoicingSettingsInput) =>
      apiFetch<InvoicingSettingsApiResponse>(
        `/api/projects/${projectId}/invoicing/settings`,
        {
          method: "PATCH",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: invoicingSettingsKeys.detail(projectId),
      });
      toast.success("Invoicing settings saved");
    },
    onError: (error: Error) => {
      toast.error("Could not save invoicing settings", {
        description: error.message,
      });
    },
  });
}
