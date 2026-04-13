"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useInvoicingSettings,
  useUpdateInvoicingSettings,
  type UpdateInvoicingSettingsInput,
} from "@/hooks/use-invoicing-settings";

const schema = z.object({
  default_billing_start_day: z.coerce.number().int().min(1).max(31),
  default_billing_end_day: z.coerce.number().int().min(1).max(31),
  default_billing_due_day: z.coerce.number().int().min(1).max(31),
  default_retainage_percent: z.coerce.number().min(0).max(100),
  allow_over_billing: z.boolean(),
  notify_subs_on_approval: z.boolean(),
  send_under_review_digest: z.boolean(),
  invite_reminder_frequency_days: z.coerce.number().int().min(0),
  invoice_pdf_footer_text: z.string(),
  invitation_custom_message: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  projectId: string;
}

export function InvoicingSettingsTab({ projectId }: Props) {
  const { data: settings, isLoading } = useInvoicingSettings(projectId);
  const updateMutation = useUpdateInvoicingSettings(projectId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<z.input<typeof schema>, any, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      default_billing_start_day: 1,
      default_billing_end_day: 30,
      default_billing_due_day: 10,
      default_retainage_percent: 10,
      allow_over_billing: false,
      notify_subs_on_approval: true,
      send_under_review_digest: true,
      invite_reminder_frequency_days: 7,
      invoice_pdf_footer_text: "",
      invitation_custom_message: "",
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        default_billing_start_day: settings.default_billing_start_day,
        default_billing_end_day: settings.default_billing_end_day,
        default_billing_due_day: settings.default_billing_due_day,
        default_retainage_percent: Number(settings.default_retainage_percent),
        allow_over_billing: settings.allow_over_billing,
        notify_subs_on_approval: settings.notify_subs_on_approval,
        send_under_review_digest: settings.send_under_review_digest,
        invite_reminder_frequency_days: settings.invite_reminder_frequency_days,
        invoice_pdf_footer_text: settings.invoice_pdf_footer_text ?? "",
        invitation_custom_message: settings.invitation_custom_message ?? "",
      });
    }
  }, [settings, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values as UpdateInvoicingSettingsInput, {
      onSuccess: (payload) => {
        const next = payload?.data;
        if (next) {
          reset(values); // mark form as clean
        }
      },
    });
  };

  const allowOverBilling = watch("allow_over_billing");
  const notifySubs = watch("notify_subs_on_approval");
  const underReviewDigest = watch("send_under_review_digest");

  if (isLoading) {
    return (
      <div className="px-6 py-8">
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Invoicing Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Defaults applied to new billing periods and subcontractor invitations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty ? (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          ) : null}
          <Button type="submit" size="sm" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Billing Period Defaults */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Billing Period Defaults
          </h3>
          <p className="text-sm text-muted-foreground">
            Applied when creating new billing periods for this project.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default_billing_start_day">Default Start Day</Label>
            <Input
              id="default_billing_start_day"
              type="number"
              min={1}
              max={31}
              {...register("default_billing_start_day")}
            />
            {errors.default_billing_start_day ? (
              <p className="text-xs text-destructive">
                {errors.default_billing_start_day.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_billing_end_day">Default End Day</Label>
            <Input
              id="default_billing_end_day"
              type="number"
              min={1}
              max={31}
              {...register("default_billing_end_day")}
            />
            {errors.default_billing_end_day ? (
              <p className="text-xs text-destructive">
                {errors.default_billing_end_day.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_billing_due_day">Default Due Day</Label>
            <Input
              id="default_billing_due_day"
              type="number"
              min={1}
              max={31}
              {...register("default_billing_due_day")}
            />
            {errors.default_billing_due_day ? (
              <p className="text-xs text-destructive">
                {errors.default_billing_due_day.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_retainage_percent">Default Retainage %</Label>
            <Input
              id="default_retainage_percent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              {...register("default_retainage_percent")}
            />
            {errors.default_retainage_percent ? (
              <p className="text-xs text-destructive">
                {errors.default_retainage_percent.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Control when subcontractors and internal users receive emails.
          </p>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="pr-4">
            <Label htmlFor="allow_over_billing" className="text-sm font-medium">
              Allow Over-Billing
            </Label>
            <p className="text-xs text-muted-foreground">
              Permit invoices that exceed the contract amount.
            </p>
          </div>
          <Switch
            id="allow_over_billing"
            checked={allowOverBilling}
            onCheckedChange={(v) =>
              setValue("allow_over_billing", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="pr-4">
            <Label htmlFor="notify_subs_on_approval" className="text-sm font-medium">
              Notify Subcontractors on Approval
            </Label>
            <p className="text-xs text-muted-foreground">
              Send an email to subs when their invoice is approved.
            </p>
          </div>
          <Switch
            id="notify_subs_on_approval"
            checked={notifySubs}
            onCheckedChange={(v) =>
              setValue("notify_subs_on_approval", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="pr-4">
            <Label htmlFor="send_under_review_digest" className="text-sm font-medium">
              Send &ldquo;Under Review&rdquo; Digest Email
            </Label>
            <p className="text-xs text-muted-foreground">
              Daily digest of invoices pending review.
            </p>
          </div>
          <Switch
            id="send_under_review_digest"
            checked={underReviewDigest}
            onCheckedChange={(v) =>
              setValue("send_under_review_digest", v, { shouldDirty: true })
            }
          />
        </div>

        <div className="space-y-2 pt-2">
          <Label htmlFor="invite_reminder_frequency_days">
            Invite Reminder Frequency (days)
          </Label>
          <Input
            id="invite_reminder_frequency_days"
            type="number"
            min={0}
            {...register("invite_reminder_frequency_days")}
          />
          <p className="text-xs text-muted-foreground">
            How often to remind subcontractors who have not accepted their invite. Set to 0 to disable.
          </p>
          {errors.invite_reminder_frequency_days ? (
            <p className="text-xs text-destructive">
              {errors.invite_reminder_frequency_days.message}
            </p>
          ) : null}
        </div>
      </section>

      {/* Documents */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Documents</h3>
          <p className="text-sm text-muted-foreground">
            Text included on generated PDFs and subcontractor invitations.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoice_pdf_footer_text">PDF Footer Text</Label>
          <Textarea
            id="invoice_pdf_footer_text"
            rows={3}
            placeholder="Appears at the bottom of every invoice PDF…"
            {...register("invoice_pdf_footer_text")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invitation_custom_message">Invitation Custom Message</Label>
          <Textarea
            id="invitation_custom_message"
            rows={4}
            placeholder="Included in the email invitation sent to subcontractors…"
            {...register("invitation_custom_message")}
          />
        </div>
      </section>
    </form>
  );
}
