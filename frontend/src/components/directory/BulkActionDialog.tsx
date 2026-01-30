"use client";

import * as React from "react";
import { Users, Shield, UserX, MailCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useSupabase } from "@/hooks/useSupabase";
import type { Database } from "@/types/database.types";
import { toast } from "@/hooks/use-toast";

type Tables = Database["public"]["Tables"];
type PermissionTemplate = Tables["permission_templates"]["Row"];
type DistributionGroup = Tables["distribution_groups"]["Row"];

interface BulkActionDialogProps {
  projectId: string;
  personIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type BulkAction =
  | "change_permission"
  | "change_status"
  | "add_to_groups"
  | "remove_from_groups"
  | "send_invites";

export function BulkActionDialog({
  projectId,
  personIds,
  open,
  onOpenChange,
  onComplete,
}: BulkActionDialogProps) {
  const supabase = useSupabase();
  const [action, setAction] = React.useState<BulkAction>("change_permission");
  const [templates, setTemplates] = React.useState<PermissionTemplate[]>([]);
  const [groups, setGroups] = React.useState<DistributionGroup[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState<
    "active" | "inactive"
  >("active");
  const [selectedGroups, setSelectedGroups] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      const [{ data: templateData }, { data: groupData }] = await Promise.all([
        supabase
          .from("permission_templates")
          .select("*")
          .eq("scope", "project")
          .order("name"),
        supabase
          .from("distribution_groups")
          .select("*")
          .eq("project_id", Number.parseInt(projectId, 10))
          .order("name"),
      ]);

      if (templateData) setTemplates(templateData);
      if (groupData) setGroups(groupData);
    };

    void loadData();
  }, [open, supabase, projectId]);

  const handleSubmit = async () => {
    if (personIds.length === 0) {
      toast.error("Select at least one person.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (action === "send_invites") {
        const response = await fetch(
          `/api/projects/${projectId}/directory/people/bulk-invite`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personIds }),
          },
        );
        if (!response.ok) throw new Error("Failed to send invitations");
      } else {
        const payload: Record<string, unknown> = {
          personIds,
          action,
        };

        if (action === "change_permission" && selectedTemplate) {
          payload.permissionTemplateId = selectedTemplate;
        }
        if (action === "change_status") {
          payload.status = selectedStatus;
        }
        if (
          (action === "add_to_groups" || action === "remove_from_groups") &&
          selectedGroups.length > 0
        ) {
          payload.groupIds = selectedGroups;
        }

        const response = await fetch(
          `/api/projects/${projectId}/directory/people/bulk-update`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error("Bulk update failed");
        }
      }

      toast.success("Bulk action completed");
      onOpenChange(false);
      if (onComplete) onComplete();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to run bulk action",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionNeedsTemplate = action === "change_permission";
  const actionNeedsStatus = action === "change_status";
  const actionNeedsGroups =
    action === "add_to_groups" || action === "remove_from_groups";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Actions</DialogTitle>
          <DialogDescription>
            Apply actions to {personIds.length} selected{" "}
            {personIds.length === 1 ? "person" : "people"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={(value) => setAction(value as BulkAction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="change_permission">
                  <Shield className="mr-2 inline h-4 w-4" />
                  Change Permission Template
                </SelectItem>
                <SelectItem value="change_status">
                  <UserX className="mr-2 inline h-4 w-4" />
                  Change Status
                </SelectItem>
                <SelectItem value="add_to_groups">
                  <Users className="mr-2 inline h-4 w-4" />
                  Add to Groups
                </SelectItem>
                <SelectItem value="remove_from_groups">
                  <Users className="mr-2 inline h-4 w-4" />
                  Remove from Groups
                </SelectItem>
                <SelectItem value="send_invites">
                  <MailCheck className="mr-2 inline h-4 w-4" />
                  Send Invitations
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionNeedsTemplate && (
            <div className="space-y-2">
              <Label>Permission Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {actionNeedsStatus && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value: "active" | "inactive") =>
                  setSelectedStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {actionNeedsGroups && (
            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="rounded-md border p-2 max-h-48 overflow-auto space-y-2">
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No distribution groups configured.
                  </p>
                )}
                {groups.map((group) => {
                  const checked = selectedGroups.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedGroups((prev) =>
                            checked
                              ? prev.filter((id) => id !== group.id)
                              : [...prev, group.id],
                          );
                        }}
                      />
                      {group.name}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (actionNeedsTemplate && !selectedTemplate) ||
              (actionNeedsGroups && selectedGroups.length === 0)
            }
          >
            {isSubmitting ? "Applying..." : "Apply"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
