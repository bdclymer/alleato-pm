"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChangeEvent } from "@/types/change-events";

export interface ChangeEventRfqFormValues {
  changeEventId: string;
  title: string;
  dueDate: string;
  includeAttachments: boolean;
  notes: string;
}

interface ChangeEventRfqFormProps {
  changeEvents: ChangeEvent[];
  isSubmitting?: boolean;
  onSubmit: (values: ChangeEventRfqFormValues) => Promise<void>;
  onCancel: () => void;
}

function formatDefaultTitle(changeEvent?: ChangeEvent) {
  if (!changeEvent) return "";
  const number = changeEvent.number || `CE-${changeEvent.id}`;
  return `RFQ for ${number} – ${changeEvent.title}`;
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function ChangeEventRfqForm({
  changeEvents,
  isSubmitting,
  onSubmit,
  onCancel,
}: ChangeEventRfqFormProps) {
  const defaultChangeEventId = changeEvents[0]?.id?.toString() ?? "";
  const form = useForm<ChangeEventRfqFormValues>({
    defaultValues: {
      changeEventId: defaultChangeEventId,
      title: formatDefaultTitle(changeEvents[0]),
      dueDate: getDefaultDueDate(),
      includeAttachments: true,
      notes: "",
    },
  });

  const selectedChangeEventId = form.watch("changeEventId");

  useEffect(() => {
    const selected = changeEvents.find(
      (event) => event.id?.toString() === selectedChangeEventId,
    );
    if (selected) {
      const currentTitle = form.getValues("title");
      if (!currentTitle || currentTitle === form.formState.defaultValues?.title) {
        form.setValue("title", formatDefaultTitle(selected));
      }
    }
  }, [selectedChangeEventId, changeEvents, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset({
      changeEventId: defaultChangeEventId,
      title: formatDefaultTitle(changeEvents[0]),
      dueDate: getDefaultDueDate(),
      includeAttachments: true,
      notes: "",
    });
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="changeEventId"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Change Event</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select change event" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {changeEvents.map((event) => (
                    <SelectItem
                      key={event.id}
                      value={event.id?.toString() ?? ""}
                    >
                      {(event.number || `CE-${event.id}`) ?? event.id} – {event.title}
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
          name="title"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>RFQ Title</FormLabel>
              <FormControl>
                <Input placeholder="RFQ title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          rules={{ required: true }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="includeAttachments"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded border p-4">
              <div className="space-y-0.5">
                <FormLabel>Include Attachments</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Attach documents from the change event to each RFQ email.
                </p>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
              </FormControl>
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
                <Textarea placeholder="Additional instructions" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create RFQ"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

