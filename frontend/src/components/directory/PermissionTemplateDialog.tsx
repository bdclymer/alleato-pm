"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Shield, Copy } from "lucide-react";
import type { Database } from "@/types/database.types";

type PermissionTemplate = Database["public"]["Tables"]["permission_templates"]["Row"];

// Define permission categories and their individual permissions
const PERMISSION_CATEGORIES = {
  "Project Management": {
    description: "Core project management capabilities",
    permissions: {
      view_project: "View project details and dashboard",
      edit_project: "Edit project information and settings",
      manage_team: "Add/remove team members",
      view_documents: "View project documents",
      upload_documents: "Upload new documents",
      delete_documents: "Delete documents",
    },
  },
  "Financial": {
    description: "Budget and financial management",
    permissions: {
      view_budget: "View project budget",
      edit_budget: "Modify budget items",
      approve_budget: "Approve budget changes",
      view_invoices: "View invoices",
      create_invoices: "Create new invoices",
      approve_invoices: "Approve invoices for payment",
      view_contracts: "View contracts",
      edit_contracts: "Edit contract details",
    },
  },
  "Directory": {
    description: "People and company management",
    permissions: {
      view_directory: "View directory entries",
      add_people: "Add new people to directory",
      edit_people: "Edit person information",
      delete_people: "Remove people from directory",
      manage_companies: "Manage company records",
      manage_groups: "Manage distribution groups",
    },
  },
  "Communication": {
    description: "Project communication tools",
    permissions: {
      view_rfis: "View RFIs",
      create_rfis: "Create new RFIs",
      respond_rfis: "Respond to RFIs",
      view_submittals: "View submittals",
      create_submittals: "Create submittals",
      approve_submittals: "Approve/reject submittals",
      view_meetings: "View meeting records",
      schedule_meetings: "Schedule new meetings",
    },
  },
  "Reporting": {
    description: "Reports and analytics",
    permissions: {
      view_reports: "View project reports",
      create_reports: "Generate new reports",
      export_reports: "Export report data",
      view_analytics: "View analytics dashboard",
    },
  },
};

const formSchema = z.object({
  name: z.string().min(1, "Template name is required").max(255),
  description: z.string().optional(),
  scope: z.enum(["global", "project"]).default("project"),
  permissions: z.record(z.string(), z.boolean()).default({}),
  is_active: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface PermissionTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PermissionTemplate | null;
  projectId?: string;
  onSuccess?: () => void;
}

export function PermissionTemplateDialog({
  open,
  onOpenChange,
  template,
  projectId,
  onSuccess,
}: PermissionTemplateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTemplates, setExistingTemplates] = useState<PermissionTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const isEditing = !!template;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      scope: "project",
      permissions: {},
      is_active: true,
    },
  });

  // Load existing template data
  useEffect(() => {
    if (template) {
      // Extract permissions from rules_json field
      const rulesJson = template.rules_json as Record<string, any> || {};
      const permissions = rulesJson.permissions || {};

      form.reset({
        name: template.name || "",
        description: template.description || "",
        scope: (template.scope as "global" | "project") || "project",
        permissions: permissions as Record<string, boolean>,
        is_active: !template.is_system,
      });
    } else {
      form.reset();
    }
  }, [template, form]);

  // Load existing templates for copying
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(
          projectId
            ? `/api/projects/${projectId}/directory/permissions`
            : `/api/directory/permission-templates`
        );

        if (response.ok) {
          const data = await response.json();
          setExistingTemplates(data);
        }
      } catch (error) {
        console.error("Failed to load templates:", error);
      }
    };

    if (open && !isEditing) {
      loadTemplates();
    }
  }, [open, isEditing, projectId]);

  // Copy permissions from selected template
  const handleCopyTemplate = () => {
    const templateToCopy = existingTemplates.find(t => String(t.id) === selectedTemplate);
    if (templateToCopy) {
      const rulesJson = templateToCopy.rules_json as Record<string, any> || {};
      const permissions = rulesJson.permissions || {};
      form.setValue("permissions", permissions as Record<string, boolean>);
      toast.success(`Copied permissions from ${templateToCopy.name}`);
    }
  };

  // Toggle all permissions in a category
  const toggleCategory = (category: string, enabled: boolean) => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    if (!categoryPermissions) return;

    const currentPermissions = form.getValues("permissions");
    const updatedPermissions = { ...currentPermissions };

    Object.keys(categoryPermissions.permissions).forEach(permission => {
      updatedPermissions[permission] = enabled;
    });

    form.setValue("permissions", updatedPermissions);
  };

  // Check if all permissions in a category are enabled
  const isCategoryEnabled = (category: string): boolean => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    if (!categoryPermissions) return false;

    const currentPermissions = form.getValues("permissions");
    return Object.keys(categoryPermissions.permissions).every(
      permission => currentPermissions[permission] === true
    );
  };

  // Check if some permissions in a category are enabled
  const isCategoryPartial = (category: string): boolean => {
    const categoryPermissions = PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES];
    if (!categoryPermissions) return false;

    const currentPermissions = form.getValues("permissions");
    const enabledCount = Object.keys(categoryPermissions.permissions).filter(
      permission => currentPermissions[permission] === true
    ).length;

    const totalCount = Object.keys(categoryPermissions.permissions).length;
    return enabledCount > 0 && enabledCount < totalCount;
  };

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);

    try {
      const url = isEditing
        ? projectId
          ? `/api/projects/${projectId}/directory/permissions/${template.id}`
          : `/api/directory/permission-templates/${template.id}`
        : projectId
          ? `/api/projects/${projectId}/directory/permissions`
          : `/api/directory/permission-templates`;

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          scope: data.scope,
          permissions: data.permissions,
          is_active: data.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEditing ? "update" : "create"} permission template`);
      }

      toast.success(`Permission template ${isEditing ? "updated" : "created"} successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Could not save permission template", { description: error instanceof Error ? error.message : "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? "Edit Permission Template" : "Create Permission Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the permission template settings."
              : "Create a new permission template to control user access."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex-1 flex flex-col space-y-6 overflow-hidden">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Project Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope</FormLabel>
                      <Select
                        onValueChange={field.onChange as any}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="global">Global</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Project templates apply to specific projects, global templates apply system-wide
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the purpose and access level of this template..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Template</FormLabel>
                      <FormDescription>
                        Inactive templates cannot be assigned to new users
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Copy from existing template */}
            {!isEditing && existingTemplates.length > 0 && (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormLabel>Copy Permissions From</FormLabel>
                  <Select
                    value={selectedTemplate}
                    onValueChange={setSelectedTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template to copy from" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingTemplates.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyTemplate}
                  disabled={!selectedTemplate}
                >
                  <Copy />
                  Copy
                </Button>
              </div>
            )}

            {/* Permissions */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <FormLabel>Permissions</FormLabel>
              <FormDescription>
                Select the permissions this template grants
              </FormDescription>

              <Tabs defaultValue={Object.keys(PERMISSION_CATEGORIES)[0]} className="flex-1 flex flex-col mt-2">
                <TabsList className="grid grid-cols-5 w-full">
                  {Object.keys(PERMISSION_CATEGORIES).map((category) => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <ScrollArea className="flex-1 mt-4">
                  {Object.entries(PERMISSION_CATEGORIES).map(([category, config]) => (
                    <TabsContent key={category} value={category} className="space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b">
                        <div>
                          {/* eslint-disable-next-line design-system/no-raw-heading */}
                          <h4 className="font-medium">{category}</h4>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toggleCategory(
                            category,
                            !isCategoryEnabled(category)
                          )}
                        >
                          {isCategoryEnabled(category) ? "Disable All" :
                           isCategoryPartial(category) ? "Enable All" : "Enable All"}
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {Object.entries(config.permissions).map(([permission, description]) => (
                          <FormField
                            key={permission}
                            control={form.control as any}
                            name="permissions"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-4 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value[permission] === true}
                                    onCheckedChange={(checked) => {
                                      field.onChange({
                                        ...field.value,
                                        [permission]: checked,
                                      });
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-normal">
                                    {permission.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    {description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </ScrollArea>
              </Tabs>
            </div>

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
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}