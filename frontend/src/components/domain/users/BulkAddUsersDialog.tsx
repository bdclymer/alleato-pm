"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, AlertCircle, CheckCircle, Plus } from "lucide-react";
import { useBulkAddUsers } from "@/hooks/use-user-mutations";
import { useCompanies } from "@/hooks/use-companies";
import { usePermissionTemplates } from "@/hooks/use-permission-templates";
import type { PersonCreateDTO } from "@/services/directoryService";
import type { Company } from "@/types/financial";

interface BulkAddUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

interface UserEntry {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_mobile: string;
  job_title: string;
  company_id: string;
  permission_template_id: string;
  department: string;
  error?: string;
}

export function BulkAddUsersDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: BulkAddUsersDialogProps) {
  const [users, setUsers] = React.useState<UserEntry[]>([]);
  const [sendInvites, setSendInvites] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [results, setResults] = React.useState<{
    created_count: number;
    failed_count: number;
    errors: Array<{ index: number; error: string }>;
  } | null>(null);

  const bulkAddMutation = useBulkAddUsers(projectId);
  const { companies } = useCompanies({ enabled: true });
  const { data: permissionTemplates } = usePermissionTemplates(projectId);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const addEmptyUser = () => {
    setUsers([
      ...users,
      {
        id: crypto.randomUUID(),
        first_name: "",
        last_name: "",
        email: "",
        phone_mobile: "",
        job_title: "",
        company_id: "",
        permission_template_id: "",
        department: "",
      },
    ]);
  };

  const removeUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  const updateUser = (id: string, field: keyof UserEntry, value: string) => {
    setUsers(
      users.map((u) =>
        u.id === id ? { ...u, [field]: value, error: undefined } : u,
      ),
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    const parsedUsers: UserEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const userEntry: UserEntry = {
        id: crypto.randomUUID(),
        first_name: "",
        last_name: "",
        email: "",
        phone_mobile: "",
        job_title: "",
        company_id: "",
        permission_template_id: "",
        department: "",
      };

      headers.forEach((header, index) => {
        const key = header.toLowerCase().replace(/\s+/g, "_");
        if (key in userEntry) {
          (userEntry as unknown as Record<string, string>)[key] =
            values[index] || "";
        }
      });

      parsedUsers.push(userEntry);
    }

    setUsers(parsedUsers);
  };

  const validateUsers = (): boolean => {
    let isValid = true;
    const emails = new Set<string>();

    const updatedUsers = users.map((user) => {
      let error = "";

      if (!user.first_name || !user.last_name) {
        error = "First and last name required";
        isValid = false;
      } else if (user.email && emails.has(user.email.toLowerCase())) {
        error = "Duplicate email in list";
        isValid = false;
      } else if (!user.permission_template_id) {
        error = "Permission template required";
        isValid = false;
      }

      if (user.email) {
        emails.add(user.email.toLowerCase());
      }

      return { ...user, error };
    });

    setUsers(updatedUsers);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateUsers()) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const usersToCreate: PersonCreateDTO[] = users.map((user) => ({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email || undefined,
        phone_mobile: user.phone_mobile || undefined,
        job_title: user.job_title || undefined,
        company_id: user.company_id || undefined,
        permission_template_id: user.permission_template_id,
        department: user.department || undefined,
        person_type: "user" as const,
      }));

      const result = await bulkAddMutation.mutateAsync({
        users: usersToCreate,
        send_invites: sendInvites,
      });

      setResults(result);

      if (result.failed_count === 0) {
        // All succeeded - close dialog after delay
        setTimeout(() => {
          onOpenChange(false);
          onSuccess?.();
        }, 2000);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setUsers([]);
    setResults(null);
    setSendInvites(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file or manually enter multiple users to add to the
            project.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CSV Upload Section */}
          {users.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-6">
              <div className="flex flex-col items-center gap-4">
                <Upload className="size-8 text-muted-foreground" />
                <div className="text-center">
                  <Text weight="medium" className="mb-1">
                    Upload CSV File
                  </Text>
                  <Text size="sm" tone="muted">
                    CSV should have columns: first_name, last_name, email,
                    phone_mobile, job_title, company_id, permission_template_id,
                    department
                  </Text>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload CSV file"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose CSV File
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Manual Entry Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Text weight="medium">
                {users.length === 0 ? "Or Add Users Manually" : "Users to Add"}
              </Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmptyUser}
              >
                <Plus />
                Add User
              </Button>
            </div>

            {users.length > 0 && (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {users.map((user, index) => (
                  <div
                    key={user.id}
                    className="border rounded-lg p-4 space-y-4 bg-muted/30"
                  >
                    <div className="flex items-center justify-between">
                      <Text size="sm" weight="medium">
                        User {index + 1}
                      </Text>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUser(user.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    {user.error && (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="size-4" />
                        <Text size="sm">{user.error}</Text>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`first_name_${user.id}`}>
                          First Name *
                        </Label>
                        <Input
                          id={`first_name_${user.id}`}
                          value={user.first_name}
                          onChange={(e) =>
                            updateUser(user.id, "first_name", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`last_name_${user.id}`}>
                          Last Name *
                        </Label>
                        <Input
                          id={`last_name_${user.id}`}
                          value={user.last_name}
                          onChange={(e) =>
                            updateUser(user.id, "last_name", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`email_${user.id}`}>Email</Label>
                        <Input
                          id={`email_${user.id}`}
                          type="email"
                          value={user.email}
                          onChange={(e) =>
                            updateUser(user.id, "email", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`phone_${user.id}`}>Phone</Label>
                        <Input
                          id={`phone_${user.id}`}
                          value={user.phone_mobile}
                          onChange={(e) =>
                            updateUser(user.id, "phone_mobile", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`job_title_${user.id}`}>
                          Job Title
                        </Label>
                        <Input
                          id={`job_title_${user.id}`}
                          value={user.job_title}
                          onChange={(e) =>
                            updateUser(user.id, "job_title", e.target.value)
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`company_${user.id}`}>Company</Label>
                        <Select
                          value={user.company_id}
                          onValueChange={(value) =>
                            updateUser(user.id, "company_id", value)
                          }
                        >
                          <SelectTrigger id={`company_${user.id}`}>
                            <SelectValue placeholder="Select company" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies?.map((company: Company) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`permission_template_${user.id}`}>
                          Permission Template *
                        </Label>
                        <Select
                          value={user.permission_template_id}
                          onValueChange={(value) =>
                            updateUser(user.id, "permission_template_id", value)
                          }
                        >
                          <SelectTrigger id={`permission_template_${user.id}`}>
                            <SelectValue placeholder="Select template" />
                          </SelectTrigger>
                          <SelectContent>
                            {permissionTemplates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor={`department_${user.id}`}>
                          Department
                        </Label>
                        <Input
                          id={`department_${user.id}`}
                          value={user.department}
                          onChange={(e) =>
                            updateUser(user.id, "department", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Invites Checkbox */}
          {users.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="send_invites"
                checked={sendInvites}
                onCheckedChange={(checked) => setSendInvites(checked === true)}
              />
              <Label htmlFor="send_invites" className="cursor-pointer">
                Send invitation emails to all users
              </Label>
            </div>
          )}

          {/* Results Summary */}
          {results && (
            <div
              className={`border rounded-lg p-4 ${
                results.failed_count === 0
                  ? "bg-green-50 border-green-200"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {results.failed_count === 0 ? (
                  <>
                    <CheckCircle className="size-5 text-green-600" />
                    <Text weight="medium" className="text-green-900">
                      All Users Added Successfully
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle className="size-5 text-yellow-600" />
                    <Text weight="medium" className="text-yellow-900">
                      Partial Success
                    </Text>
                  </>
                )}
              </div>
              <Text size="sm" className="mb-2">
                {results.created_count} users added successfully.{" "}
                {results.failed_count > 0 && `${results.failed_count} failed.`}
              </Text>
              {results.errors.length > 0 && (
                <div className="mt-4 space-y-1">
                  <Text size="sm" weight="medium">
                    Errors:
                  </Text>
                  {results.errors.map((err) => (
                    <Text key={err.index} size="xs" tone="muted">
                      User {err.index + 1}: {err.error}
                    </Text>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {results ? "Close" : "Cancel"}
          </Button>
          {!results && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || users.length === 0}
            >
              {isProcessing
                ? "Adding Users..."
                : `Add ${users.length} User${users.length !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
