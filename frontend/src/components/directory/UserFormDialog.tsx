"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { useCompanies } from "@/hooks/use-companies";
import { Loader2 } from "lucide-react";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  permissionTemplate: string;
  isInternalEmployee: boolean;
  companyId: string;
  companyName: string;
}

export function UserFormDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: UserFormDialogProps) {
  const [formData, setFormData] = React.useState<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    permissionTemplate: "",
    isInternalEmployee: false,
    companyId: "",
    companyName: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { companies, options, isLoading: isLoadingCompanies } = useCompanies();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // TODO: Implement user creation logic
      // This would involve:
      // 1. Creating/finding the user in the auth system
      // 2. Creating a person record
      // 3. Associating the person with the project
      // 4. Setting up permissions

      // Simulate success for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        permissionTemplate: "",
        isInternalEmployee: false,
        companyId: "",
        companyName: "",
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      permissionTemplate: "",
      isInternalEmployee: false,
      companyId: "",
      companyName: "",
    });
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="John"
                required
              />
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john.doe@example.com"
              required
            />
          </div>

          {/* Permission Template */}
          <div className="space-y-2">
            <Label htmlFor="permissionTemplate">Permission Template</Label>
            <Select
              value={formData.permissionTemplate}
              onValueChange={(value) =>
                setFormData({ ...formData, permissionTemplate: value })
              }
            >
              <SelectTrigger id="permissionTemplate">
                <SelectValue placeholder="Select a permission template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin - Full Access</SelectItem>
                <SelectItem value="project-manager">Project Manager</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="superintendent">Superintendent</SelectItem>
                <SelectItem value="foreman">Foreman</SelectItem>
                <SelectItem value="read-only">Read Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select a permission template to control what this user can access
            </p>
          </div>

          {/* Internal Employee */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="isInternalEmployee"
              checked={formData.isInternalEmployee}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  isInternalEmployee: checked === true,
                })
              }
            />
            <div className="space-y-1">
              <Label
                htmlFor="isInternalEmployee"
                className="font-normal cursor-pointer"
              >
                Internal Employee?
              </Label>
              <p className="text-xs text-muted-foreground">
                Check this box if the user is an employee of your company
              </p>
            </div>
          </div>

          {/* Company Selection */}
          <div className="space-y-2">
            <Label htmlFor="companyId">
              Company <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.companyId}
              onValueChange={(value) =>
                setFormData({ ...formData, companyId: value })
              }
            >
              <SelectTrigger id="companyId">
                <SelectValue placeholder="Select a company" />
                {isLoadingCompanies && (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                )}
              </SelectTrigger>
              <SelectContent>
                {options.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
                {options.length === 0 && !isLoadingCompanies && (
                  <SelectItem disabled value="">
                    No companies found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the company this user belongs to
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding User..." : "Add User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
