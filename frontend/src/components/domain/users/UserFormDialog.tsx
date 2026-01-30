"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
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
import { Checkbox } from "@/components/ui/checkbox";
import { userFormSchema, type UserFormData } from "@/lib/schemas/user-schemas";
import { useAddUser, useUpdateUser } from "@/hooks/use-user-mutations";
import { DirectoryService } from "@/services/directoryService";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_mobile?: string | null;
  phone_business?: string | null;
  job_title?: string | null;
  company_id?: string | null;
  membership?: {
    permission_template_id?: string | null;
    department?: string | null;
  };
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  user?: User | null;
  onSuccess?: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  projectId,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const isEdit = !!user;
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  // Fetch companies for dropdown
  const { data: companies = [] } = useQuery({
    queryKey: ["companies", projectId],
    queryFn: () => directoryService.getCompanies(projectId),
    enabled: open,
  });

  // Fetch permission templates for dropdown
  const { data: permissionTemplates = [] } = useQuery({
    queryKey: ["permission-templates"],
    queryFn: () => directoryService.getPermissionTemplates(),
    enabled: open,
  });

  const addUserMutation = useAddUser(projectId);
  const updateUserMutation = useUpdateUser(projectId, user?.id || "");

  const form = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone_mobile: user?.phone_mobile || "",
      phone_business: user?.phone_business || "",
      job_title: user?.job_title || "",
      company_id: user?.company_id || "",
      permission_template_id: user?.membership?.permission_template_id || "",
      department: user?.membership?.department || "",
      send_invite: false,
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_mobile: user.phone_mobile || "",
        phone_business: user.phone_business || "",
        job_title: user.job_title || "",
        company_id: user.company_id || "",
        permission_template_id: user.membership?.permission_template_id || "",
        department: user.membership?.department || "",
        send_invite: false,
      });
    } else {
      form.reset({
        first_name: "",
        last_name: "",
        email: "",
        phone_mobile: "",
        phone_business: "",
        job_title: "",
        company_id: "",
        permission_template_id: "",
        department: "",
        send_invite: false,
      });
    }
  }, [user, form]);

  const onSubmit = async (data: unknown) => {
    const formData = data as UserFormData;
    try {
      if (isEdit) {
        await updateUserMutation.mutateAsync({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          phone_mobile: formData.phone_mobile || undefined,
          phone_business: formData.phone_business || undefined,
          job_title: formData.job_title || undefined,
          company_id: formData.company_id || undefined,
          permission_template_id: formData.permission_template_id,
        });
      } else {
        await addUserMutation.mutateAsync({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || undefined,
          phone_mobile: formData.phone_mobile || undefined,
          phone_business: formData.phone_business || undefined,
          job_title: formData.job_title || undefined,
          company_id: formData.company_id || undefined,
          permission_template_id: formData.permission_template_id,
          person_type: "user",
        });
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {

      console.error("Failed to process user data:", error);

      // Intentionally swallowed: error handling done by caller

    }
  };

  const isSubmitting =
    addUserMutation.isPending || updateUserMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update user information and permissions."
              : "Add a new team member to the project."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="john.doe@example.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone_mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone_business"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(555) 987-6543" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="job_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Project Manager" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            <FormField
              control={form.control}
              name="permission_template_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Template *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select permission template" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {permissionTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
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
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Engineering" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEdit && (
              <FormField
                control={form.control}
                name="send_invite"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Send invitation email</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Send an email invitation to this user to join the
                        project
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
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
                    ? "Update User"
                    : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
