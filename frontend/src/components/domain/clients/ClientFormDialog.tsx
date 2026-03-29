"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  clientSchema,
  type ClientFormData,
} from "@/lib/schemas/financial-schemas";
import { createClient, updateClient } from "@/app/(main)/actions/table-actions";
import { useCompanies } from "@/hooks/use-companies";

interface Client {
  id: string;
  name: string | null;
  company_id: string | null;
  status: string | null;
  created_at: string;
}

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSuccess?: () => void;
}

const CLIENT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormDialogProps) {
  const isEdit = !!client;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { companies, isLoading: isLoadingCompanies } = useCompanies({});

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormData>,
    reValidateMode: "onBlur",
    defaultValues: {
      name: client?.name || "",
      company_id: client?.company_id || null,
      status: (client?.status as "active" | "inactive") || "active",
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: client?.name || "",
        company_id: client?.company_id || null,
        status: (client?.status as "active" | "inactive") || "active",
      });
    }
  }, [open, client, form]);

  const onSubmit = async (data: ClientFormData) => {
    setIsSubmitting(true);
    try {
      const cleanData = {
        name: data.name,
        company_id: data.company_id || null,
        status: data.status,
      };

      let result;
      if (isEdit && client) {
        result = await updateClient(client.id, cleanData);
      } else {
        result = await createClient(cleanData);
      }

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit ? "Client updated successfully" : "Client created successfully",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add New Client"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the client information below."
              : "Fill in the details to create a new client."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField<ClientFormData>
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<ClientFormData>
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Company</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? null : value)
                    }
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No company</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField<ClientFormData>
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? "active"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLIENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <Button
                type="submit"
                disabled={isSubmitting || isLoadingCompanies}
              >
                {isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Client"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
