"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSupabase } from "@/hooks/useSupabase";
import type { PersonWithDetails } from "@/components/directory/DirectoryFilters";
import type { Database } from "@/types/database.types";

type Tables = Database["public"]["Tables"];
type Company = Tables["companies"]["Row"];
type PermissionTemplate = Tables["permission_templates"]["Row"];

interface PersonEditDialogProps {
  person: PersonWithDetails | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  mode?: "create" | "edit";
}

interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_mobile: string;
  phone_business: string;
  job_title: string;
  company_id: string;
  person_type: "user" | "contact";
  permission_template_id: string;
}

/**
 * Renders a modal dialog for creating or editing a person in a project's directory.
 *
 * The dialog displays a form for person details (name, contact info, job title, company, type, and permission template),
 * validates required fields (first name, last name, and email when the person type is "user"), and submits create or update
 * requests to the project-scoped directory API. On successful save the dialog closes and an optional callback is invoked;
 * on failure an inline error message is shown and a destructive toast is emitted.
 *
 * @param person - The person to edit, or `null` to open the dialog in create mode.
 * @param projectId - The project identifier used to scope API requests.
 * @param open - Whether the dialog is currently open.
 * @param onOpenChange - Callback invoked when the dialog open state changes.
 * @param onSuccess - Optional callback invoked after a successful create or update.
 * @param mode - Explicit mode override, either `"create"` or `"edit"`. Defaults to `"edit"` when `person` is provided, otherwise `"create"`.
 * @returns The dialog UI element for creating or editing a person.
 */
export function PersonEditDialog({
  person,
  projectId,
  open,
  onOpenChange,
  onSuccess,
  mode = person ? "edit" : "create",
}: PersonEditDialogProps) {
  const { toast } = useToast();
  const supabase = useSupabase();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<
    PermissionTemplate[]
  >([]);
  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone_mobile: "",
    phone_business: "",
    job_title: "",
    company_id: "",
    person_type: "user",
    permission_template_id: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Load form data when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        first_name: person.first_name || "",
        last_name: person.last_name || "",
        email: person.email || "",
        phone_mobile: person.phone_mobile || "",
        phone_business: person.phone_business || "",
        job_title: person.job_title || "",
        company_id: person.company?.id || "",
        person_type: person.person_type,
        permission_template_id:
          person.permission_template?.id ||
          person.membership?.permission_template_id ||
          "",
      });
    } else {
      // Reset for create mode
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone_mobile: "",
        phone_business: "",
        job_title: "",
        company_id: "",
        person_type: "user",
        permission_template_id: "",
      });
    }
  }, [person]);

  // Load companies and permission templates
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load companies
        const { data: companiesData } = await supabase
          .from("companies")
          .select("*")
          .order("name");

        if (companiesData) {
          setCompanies(companiesData);
        }

        // Load permission templates
        const { data: templatesData } = await supabase
          .from("permission_templates")
          .select("*")
          .eq("scope", "project")
          .order("name");

        if (templatesData) {
          setPermissionTemplates(templatesData);
        }
      } catch (error) {

        console.error("Failed to process contact:", error);

        // Intentionally swallowed: error handling done by caller

      }
    };

    if (open) {
      loadData();
    }
  }, [open, supabase]);

  const handleAvatarChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (personId: string) => {
    if (!avatarFile) return;
    const uploadData = new FormData();
    uploadData.append("file", avatarFile);
    const response = await fetch(
      `/api/projects/${projectId}/directory/people/${personId}/profile-photo`,
      {
        method: "POST",
        body: uploadData,
      },
    );
    if (!response.ok) {
      throw new Error("Failed to upload profile photo");
    }
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Validation
    if (!formData.first_name || !formData.last_name) {
      setError("First name and last name are required");
      setSaving(false);
      return;
    }

    if (formData.person_type === "user" && !formData.email) {
      setError("Email is required for users");
      setSaving(false);
      return;
    }

    try {
      const url =
        mode === "create"
          ? `/api/projects/${projectId}/directory/people`
          : `/api/projects/${projectId}/directory/people/${person?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          company_id: formData.company_id || null,
          permission_template_id: formData.permission_template_id || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save person");
      }

      const savedPersonId = result?.id || person?.id;
      if (savedPersonId && avatarFile) {
        await uploadAvatar(savedPersonId);
      }

      toast.success(
        `${formData.first_name} ${formData.last_name} has been ${mode === "create" ? "created" : "updated"}.`,
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);

      toast.error(`Failed to ${mode} person: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const existingAvatarUrl =
    person && person.id
      ? `/api/avatar/${person.id}?projectId=${projectId}${
          person.avatar_updated_at
            ? `&v=${encodeURIComponent(person.avatar_updated_at)}`
            : ""
        }`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add New Person" : "Edit Person"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new person to the project directory"
              : "Update person information and permissions"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Person Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="person-type">Type</Label>
              <Select
                value={formData.person_type}
                onValueChange={(value) =>
                  updateField("person_type", value as "user" | "contact")
                }
                disabled={mode === "edit"}
              >
                <SelectTrigger id="person-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Can login)</SelectItem>
                  <SelectItem value="contact">Contact (No login)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">
                First Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="first-name"
                value={formData.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-name">
                Last Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="last-name"
                value={formData.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email{" "}
              {formData.person_type === "user" && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone-mobile">Mobile Phone</Label>
              <Input
                id="phone-mobile"
                type="tel"
                value={formData.phone_mobile}
                onChange={(e) => updateField("phone_mobile", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone-business">Business Phone</Label>
              <Input
                id="phone-business"
                type="tel"
                value={formData.phone_business}
                onChange={(e) => updateField("phone_business", e.target.value)}
                placeholder="+1 (555) 987-6543"
              />
            </div>
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="job-title">Job Title</Label>
            <Input
              id="job-title"
              value={formData.job_title}
              onChange={(e) => updateField("job_title", e.target.value)}
              placeholder="Project Manager"
            />
          </div>

          <div className="space-y-2">
            <Label>Profile Photo</Label>
            <Input type="file" accept="image/*" onChange={handleAvatarChange} />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, or WEBP up to 2MB.
            </p>
            <div className="flex items-center gap-3">
              {(avatarPreview || existingAvatarUrl) && (
                <img
                  src={avatarPreview || existingAvatarUrl || ""}
                  alt="Avatar preview"
                  className="h-12 w-12 rounded-full border object-cover"
                />
              )}
            </div>
          </div>

          {/* Company */}
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => updateField("company_id", value)}
            >
              <SelectTrigger id="company">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Company</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Permission Template */}
          {formData.person_type === "user" && (
            <div className="space-y-2">
              <Label htmlFor="permission-template">Permission Template</Label>
              <Select
                value={formData.permission_template_id}
                onValueChange={(value) =>
                  updateField("permission_template_id", value)
                }
              >
                <SelectTrigger id="permission-template">
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Permissions</SelectItem>
                  {permissionTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {mode === "create" ? "Create Person" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
