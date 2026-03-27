"use client";

import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

interface GlobalUserOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  job_title: string | null;
  company: {
    id: string;
    name: string | null;
  } | null;
}

type AddMode = "select" | "create";

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

  const [addMode, setAddMode] = React.useState<AddMode>("select");
  const [searchValue, setSearchValue] = React.useState("");
  const [selectedPersonId, setSelectedPersonId] = React.useState("");
  const [selectPermissionTemplateId, setSelectPermissionTemplateId] =
    React.useState("");
  const [selectSendInvite, setSelectSendInvite] = React.useState(false);

  const addUserMutation = useAddUser(projectId);
  const updateUserMutation = useUpdateUser(projectId, user?.id || "");

  const addExistingMutation = useMutation({
    mutationFn: async (payload: {
      personId: string;
      permissionTemplateId: string;
      sendInvite: boolean;
    }) => {
      await directoryService.addPersonToProject(projectId, {
        person_id: payload.personId,
        permission_template_id: payload.permissionTemplateId,
        person_type: "user",
      });

      let inviteSent = false;
      if (payload.sendInvite) {
        const response = await fetch(
          `/api/projects/${projectId}/directory/people/${payload.personId}/invite`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
        );
        inviteSent = response.ok;
      }

      return { inviteSent };
    },
  });

  const form = useForm({
    resolver: zodResolver(userFormSchema),
    reValidateMode: "onBlur",
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

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", projectId],
    queryFn: () => directoryService.getCompanies(projectId),
    enabled: open && (isEdit || addMode === "create"),
  });

  const { data: permissionTemplates = [] } = useQuery({
    queryKey: ["permission-templates"],
    queryFn: () => directoryService.getPermissionTemplates(),
    enabled: open,
  });

  const { data: globalUsersData, isFetching: isSearchingUsers } = useQuery({
    queryKey: ["global-users", searchValue],
    queryFn: () =>
      directoryService.getGlobalPeople({
        search: searchValue || undefined,
        type: "user",
        status: "active",
        perPage: 100,
      }),
    enabled: open && !isEdit && addMode === "select",
  });

  const { data: projectUsersData } = useQuery({
    queryKey: ["project-users-all-status", projectId],
    queryFn: () =>
      directoryService.getPeople(projectId, {
        type: "user",
        status: "all",
        perPage: 500,
      }),
    enabled: open && !isEdit && addMode === "select",
  });

  const projectUserIds = React.useMemo(() => {
    return new Set((projectUsersData?.data || []).map((person) => person.id));
  }, [projectUsersData]);

  const globalUsers = React.useMemo<GlobalUserOption[]>(() => {
    return (globalUsersData?.data || []).map((person) => ({
      id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      email: person.email,
      job_title: person.job_title,
      company: person.company,
    }));
  }, [globalUsersData]);

  React.useEffect(() => {
    if (!open) return;

    if (isEdit) {
      setAddMode("create");
      form.reset({
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
      });
      return;
    }

    setAddMode("select");
    setSearchValue("");
    setSelectedPersonId("");
    setSelectPermissionTemplateId("");
    setSelectSendInvite(false);
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
  }, [open, isEdit, user, form]);

  const onSubmitCreateOrEdit = async (values: unknown) => {
    const formData = values as UserFormData;

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
          send_invite: formData.send_invite,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to process user data:", error);
    }
  };

  const onSelectExisting = async () => {
    if (!selectedPersonId) {
      toast.error("Select a user to add to this project");
      return;
    }

    if (projectUserIds.has(selectedPersonId)) {
      toast.error("This user is already on the project");
      return;
    }

    if (!selectPermissionTemplateId) {
      toast.error("Select a permission template");
      return;
    }

    try {
      const { inviteSent } = await addExistingMutation.mutateAsync({
        personId: selectedPersonId,
        permissionTemplateId: selectPermissionTemplateId,
        sendInvite: selectSendInvite,
      });

      toast.success(
        inviteSent
          ? "User added to project and invitation sent"
          : "User added to project",
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add user";
      toast.error(message);
    }
  };

  const isSubmitting =
    addUserMutation.isPending ||
    updateUserMutation.isPending ||
    addExistingMutation.isPending;

  const selectedGlobalUser = globalUsers.find(
    (person) => person.id === selectedPersonId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add Contact to Project"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update user information and permissions."
              : addMode === "select"
                ? "Search existing users first. Create a new user only if no match exists."
                : "Create a new global user and add them to this project."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={addMode === "select" ? "default" : "outline"}
              onClick={() => setAddMode("select")}
              disabled={isSubmitting}
            >
              Search Existing
            </Button>
            <Button
              type="button"
              variant={addMode === "create" ? "default" : "outline"}
              onClick={() => setAddMode("create")}
              disabled={isSubmitting}
            >
              <UserPlus />
              Create New User
            </Button>
          </div>
        )}

        {!isEdit && addMode === "select" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search by name or email"
                  className="pl-9"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Select an existing global user. Already-added users are shown as unavailable.
              </p>
            </div>

            <div className="border rounded-md divide-y max-h-[260px] overflow-y-auto">
              {isSearchingUsers ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching users...
                </div>
              ) : globalUsers.length === 0 ? (
                <div className="py-8 px-4 text-center text-sm text-muted-foreground space-y-2">
                  <p>No matching users found.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAddMode("create")}
                  >
                    Create New User
                  </Button>
                </div>
              ) : (
                globalUsers.map((person) => {
                  const isAlreadyOnProject = projectUserIds.has(person.id);
                  const isSelected = selectedPersonId === person.id;
                  const fullName = `${person.first_name || ""} ${person.last_name || ""}`.trim();

                  return (
                    <Button
                      key={person.id}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "w-full text-left px-3 py-3 flex items-center justify-between h-auto font-normal",
                        isSelected && "bg-muted/60",
                        isAlreadyOnProject && "opacity-60 cursor-not-allowed hover:bg-transparent",
                      )}
                      onClick={() => {
                        if (!isAlreadyOnProject) setSelectedPersonId(person.id);
                      }}
                      disabled={isAlreadyOnProject}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fullName || "Unnamed User"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {person.email || "No email"}
                          {person.company?.name ? ` • ${person.company.name}` : ""}
                        </p>
                        {person.job_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {person.job_title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {isAlreadyOnProject ? (
                          <Badge variant="secondary">Already on project</Badge>
                        ) : isSelected ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : null}
                      </div>
                    </Button>
                  );
                })
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <FormLabel>Permission Template *</FormLabel>
                <Select
                  value={selectPermissionTemplateId}
                  onValueChange={setSelectPermissionTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission template" />
                  </SelectTrigger>
                  <SelectContent>
                    {permissionTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 rounded-md border p-4">
                <Checkbox
                  checked={selectSendInvite}
                  onCheckedChange={(checked) => setSelectSendInvite(checked === true)}
                  id="send-existing-invite"
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="send-existing-invite"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Send invitation email
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Send or resend invite after adding this user to the project.
                  </p>
                </div>
              </div>
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
              <Button
                type="button"
                disabled={
                  isSubmitting ||
                  !selectedPersonId ||
                  !selectPermissionTemplateId ||
                  (selectedGlobalUser
                    ? projectUserIds.has(selectedGlobalUser.id)
                    : false)
                }
                onClick={onSelectExisting}
              >
                {isSubmitting ? "Saving..." : "Add Selected User"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitCreateOrEdit)}
              className="space-y-4"
            >
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

              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  Duplicate prevention: if this email already exists in the global directory,
                  we will reuse that existing user and add them to this project.
                </p>
              )}

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
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send invitation email</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Send an email invitation to this user to join the project
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
                      : "Create and Add User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
