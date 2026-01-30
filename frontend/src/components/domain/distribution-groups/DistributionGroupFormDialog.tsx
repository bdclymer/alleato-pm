"use client";

import * as React from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useCreateGroup } from "@/hooks/use-distribution-groups";
import { useProjectUsers } from "@/hooks/use-project-users";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";

const distributionGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  member_ids: z.array(z.string()).optional(),
});

type DistributionGroupFormData = z.infer<typeof distributionGroupSchema>;

interface DistributionGroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess?: () => void;
}

function getInitials(
  firstName: string | null,
  lastName: string | null,
): string {
  const first = firstName?.[0] || "";
  const last = lastName?.[0] || "";
  return `${first}${last}`.toUpperCase() || "?";
}

export function DistributionGroupFormDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: DistributionGroupFormDialogProps) {
  const createGroup = useCreateGroup(projectId);
  const { users, isLoading: loadingUsers } = useProjectUsers(projectId, {
    status: "active",
  });
  const [searchQuery, setSearchQuery] = React.useState("");

  const form = useForm<DistributionGroupFormData>({
    resolver: zodResolver(distributionGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      member_ids: [],
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        description: "",
        member_ids: [],
      });
      setSearchQuery("");
    }
  }, [open, form]);

  const onSubmit = async (data: DistributionGroupFormData) => {
    try {
      await createGroup.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        member_ids: data.member_ids || [],
      });

      toast.success("Distribution group created successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create distribution group";
      toast.error(errorMessage);
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchQuery) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const firstName = user.first_name?.toLowerCase() || "";
      const lastName = user.last_name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query)
      );
    });
  }, [users, searchQuery]);

  const selectedMemberIds = form.watch("member_ids") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Distribution Group</DialogTitle>
          <DialogDescription>
            Create a new distribution group to organize team members for
            communication.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Site Supervisors" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of this group's purpose..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="member_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Members</FormLabel>
                  <FormDescription>
                    Select users to add to this group (
                    {selectedMemberIds.length} selected)
                  </FormDescription>

                  <div className="space-y-3">
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />

                    <ScrollArea className="h-[250px] rounded-md border p-3">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          Loading users...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                          {searchQuery
                            ? "No users found matching your search"
                            : "No active users available"}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredUsers.map((user) => (
                            <FormField
                              key={user.id}
                              control={form.control}
                              name="member_ids"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={user.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 hover:bg-accent/50 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(user.id)}
                                        onCheckedChange={(checked) => {
                                          const currentValue =
                                            field.value || [];
                                          const newValue = checked
                                            ? [...currentValue, user.id]
                                            : currentValue.filter(
                                                (id) => id !== user.id,
                                              );
                                          field.onChange(newValue);
                                        }}
                                      />
                                    </FormControl>
                                    <div className="flex items-center gap-3 flex-1">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                          {getInitials(
                                            user.first_name,
                                            user.last_name,
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div className="flex-1 space-y-1">
                                        <Text
                                          size="sm"
                                          weight="medium"
                                          className="leading-none"
                                        >
                                          {user.first_name} {user.last_name}
                                        </Text>
                                        {user.email && (
                                          <Text size="sm" tone="muted">
                                            {user.email}
                                          </Text>
                                        )}
                                      </div>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createGroup.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createGroup.isPending}>
                {createGroup.isPending ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
