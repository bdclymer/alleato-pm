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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Users, UserPlus, X } from "lucide-react";
import type { Database } from "@/types/database.types";
import { useDirectory } from "@/hooks/useDirectory";

type DistributionGroup = Database["public"]["Tables"]["distribution_groups"]["Row"];
type Person = Database["public"]["Tables"]["people"]["Row"];

const formSchema = z.object({
  name: z.string().min(1, "Group name is required").max(255),
  description: z.string().optional(),
  type: z.enum(["internal", "external", "mixed"]).default("internal"),
  is_active: z.boolean().default(true),
  member_ids: z.array(z.number()).default([]),
});

type FormData = z.infer<typeof formSchema>;

interface DistributionGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: DistributionGroup | null;
  projectId: string;
  onSuccess?: () => void;
}

export function DistributionGroupDialog({
  open,
  onOpenChange,
  group,
  projectId,
  onSuccess,
}: DistributionGroupDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const { data: people, loading: loadingPeople } = useDirectory(projectId);
  const isEditing = !!group;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      type: "internal",
      is_active: true,
      member_ids: [],
    },
  });

  // Load existing group data and members
  useEffect(() => {
    if (group) {
      // Extract metadata fields if they exist
      const metadata = (group as any).metadata || {};
      const type = metadata.type || "internal";
      const isActive = group.status === "active";

      form.reset({
        name: group.name || "",
        description: group.description || "",
        type: type as "internal" | "external" | "mixed",
        is_active: isActive,
        member_ids: [],
      });

      // Load group members
      loadGroupMembers(String(group.id));
    } else {
      form.reset();
      setSelectedMembers([]);
    }
  }, [group, form]);

  const loadGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/directory/groups/${groupId}/members`
      );
      if (response.ok) {
        const members = await response.json();
        const memberIds = members.map((m: any) => Number(m.person_id));
        setSelectedMembers(memberIds);
        form.setValue("member_ids", memberIds);
      }
    } catch (error) {
      console.error("Failed to load group members:", error);
    }
  };

  const filteredPeople = people.filter(
    (person) =>
      person.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMember = (personId: number) => {
    const newMembers = selectedMembers.includes(personId)
      ? selectedMembers.filter((id) => id !== personId)
      : [...selectedMembers, personId];

    setSelectedMembers(newMembers);
    form.setValue("member_ids", newMembers);
  };

  const removeMember = (personId: number) => {
    const newMembers = selectedMembers.filter((id) => id !== personId);
    setSelectedMembers(newMembers);
    form.setValue("member_ids", newMembers);
  };

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);

    try {
      // Create or update group
      const url = isEditing
        ? `/api/projects/${projectId}/directory/groups/${group.id}`
        : `/api/projects/${projectId}/directory/groups`;

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          type: data.type,
          is_active: data.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${isEditing ? "update" : "create"} group`);
      }

      const savedGroup = await response.json();

      // Update group members
      if (data.member_ids.length > 0 || isEditing) {
        const membersResponse = await fetch(
          `/api/projects/${projectId}/directory/groups/${savedGroup.id}/members`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              member_ids: data.member_ids,
            }),
          }
        );

        if (!membersResponse.ok) {
          console.error("Failed to update group members");
        }
      }

      toast.success(`Group ${isEditing ? "updated" : "created"} successfully`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {isEditing ? "Edit Distribution Group" : "Create Distribution Group"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the group information and members."
              : "Create a new distribution group to organize people."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Engineering Team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Type</FormLabel>
                    <Select
                      onValueChange={field.onChange as any}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
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
                      placeholder="Describe the purpose of this group..."
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
                    <FormLabel>Active Group</FormLabel>
                    <FormDescription>
                      Inactive groups cannot be used for communications
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div>
                <FormLabel>Group Members</FormLabel>
                <FormDescription>
                  Select people to include in this distribution group
                </FormDescription>
              </div>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    Selected Members ({selectedMembers.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((memberId) => {
                      const person = people.find((p) => String(p.id) === String(memberId));
                      if (!person) return null;
                      return (
                        <Badge
                          key={memberId}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {person.first_name} {person.last_name}
                          <button
                            type="button"
                            onClick={() => removeMember(Number(memberId))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* People Search */}
              <div className="space-y-2">
                <Input
                  placeholder="Search people to add..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />

                <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                  {loadingPeople ? (
                    <div className="text-center text-muted-foreground">
                      Loading people...
                    </div>
                  ) : filteredPeople.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      No people found
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredPeople.map((person) => (
                        <div
                          key={person.id}
                          className="flex items-center space-x-4"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(Number(person.id))}
                            onCheckedChange={() => toggleMember(Number(person.id))}
                          />
                          <label
                            className="flex-1 cursor-pointer text-sm"
                            onClick={() => toggleMember(Number(person.id))}
                          >
                            <div className="font-medium">
                              {person.first_name} {person.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {person.email}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Group" : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}