"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "@/components/layout";
import { createDailyLog } from "@/app/(main)/actions/daily-log-actions";

const schema = z.object({
  log_date: z.string().min(1, "Date is required"),
  weather_conditions: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewDailyLogPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Number(params.projectId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      log_date: new Date().toISOString().split("T")[0],
      weather_conditions: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    const result = await createDailyLog({
      projectId,
      logDate: values.log_date,
      weatherConditions: values.weather_conditions || undefined,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Daily log created");
    router.push(`/${projectId}/daily-log`);
  };

  return (
    <PageShell
      variant="form"
      title="New Daily Log"
      description="Create a new daily construction log entry"
      onBack={() => router.push(`/${projectId}/daily-log`)}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <div className="space-y-2">
          <Label htmlFor="log_date">Date</Label>
          <Input id="log_date" type="date" {...register("log_date")} />
          {errors.log_date && (
            <p className="text-sm text-destructive">{errors.log_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="weather_conditions">Weather Conditions</Label>
          <Textarea
            id="weather_conditions"
            placeholder="Describe weather conditions..."
            rows={3}
            {...register("weather_conditions")}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Log Entry"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/${projectId}/daily-log`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
