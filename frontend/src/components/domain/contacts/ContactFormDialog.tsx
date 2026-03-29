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
  contactSchema,
  type ContactFormData,
} from "@/lib/schemas/contact-schema";
import { createContact, updateContact } from "@/app/(main)/actions/table-actions";
import { createClient } from "@/lib/supabase/client";
import { CompanyFormDialog } from "@/components/domain/companies/CompanyFormDialog";
import { Building2, Plus } from "lucide-react";

interface Contact {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  job_title: string | null;
  department: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
}

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  onSuccess?: () => void;
}

interface Company {
  id: string;
  name: string;
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

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const isEdit = !!contact;
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = React.useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    reValidateMode: "onBlur",
    defaultValues: {
      first_name: contact?.first_name || "",
      last_name: contact?.last_name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      company_id: contact?.company_id || "",
      job_title: contact?.job_title || "",
      department: contact?.department || "",
      address: contact?.address || "",
      city: contact?.city || "",
      state: contact?.state || "",
      zip: contact?.zip || "",
      notes: contact?.notes || "",
    },
  });

  // Fetch companies for dropdown
  const fetchCompanies = React.useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open, fetchCompanies]);

  const handleCompanyCreated = () => {
    fetchCompanies();
  };

  const handleAddCompanyClick = () => {
    setCompanyDialogOpen(true);
  };

  React.useEffect(() => {
    if (open) {
      form.reset({
        first_name: contact?.first_name || "",
        last_name: contact?.last_name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        company_id: contact?.company_id || "",
        job_title: contact?.job_title || "",
        department: contact?.department || "",
        address: contact?.address || "",
        city: contact?.city || "",
        state: contact?.state || "",
        zip: contact?.zip || "",
        notes: contact?.notes || "",
      });
    }
  }, [open, contact, form]);

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...data,
        email: data.email || null,
        phone: data.phone || null,
        company_id:
          data.company_id && data.company_id.trim() !== ""
            ? data.company_id
            : null,
        job_title: data.job_title || null,
        department: data.department || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip: data.zip || null,
        notes: data.notes || null,
      };

      let result: { error?: string; success?: boolean };
      if (isEdit && contact) {
        result = await updateContact(contact.id.toString(), cleanData);
      } else {
        result = await createContact(cleanData);
      }

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Contact updated successfully"
          : "Contact created successfully",
      );
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Contact" : "New Contact"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the contact information below."
              : "Fill in the details to create a new contact."}
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
                      <Input placeholder="Enter first name" {...field} />
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
                      <Input placeholder="Enter last name" {...field} />
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
                      placeholder="email@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" type="tel" {...field} />
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isLoadingCompanies}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingCompanies
                              ? "Loading companies..."
                              : "Select company"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2 border-b">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-primary hover:text-primary"
                          onClick={handleAddCompanyClick}
                        >
                          <Plus />
                          Add New Company
                        </Button>
                      </div>
                      {companies.length === 0 && !isLoadingCompanies ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Building2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          No companies yet. Create one above.
                        </div>
                      ) : (
                        companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="job_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Project Manager" {...field} />
                    </FormControl>
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
                      <Input placeholder="Operations" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <div className="grid grid-cols-3 gap-4">
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
                          <SelectValue placeholder="State" />
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

              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP</FormLabel>
                    <FormControl>
                      <Input placeholder="12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about this contact..."
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
                    : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <CompanyFormDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onSuccess={handleCompanyCreated}
      />
    </Dialog>
  );
}
