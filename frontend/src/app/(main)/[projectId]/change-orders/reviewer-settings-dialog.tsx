"use client";

import * as React from "react";
import { Loader2, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ReviewerSettingsDialogProps {
  projectId: string;
}

interface ReviewerMember {
  person_id: string;
  full_name: string;
  email: string | null;
  role: string | null;
  is_admin: boolean;
  is_reviewer: boolean;
  reviewer_source: "admin" | "manual" | "none";
}

export function ReviewerSettingsDialog({ projectId }: ReviewerSettingsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [members, setMembers] = React.useState<ReviewerMember[]>([]);
  const [search, setSearch] = React.useState("");
  const [updatingPersonId, setUpdatingPersonId] = React.useState<string | null>(
    null,
  );

  const loadMembers = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/reviewer-settings`,
      );
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error || "Failed to load reviewer settings");
        setMembers([]);
        return;
      }

      setMembers(payload.data ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load reviewer settings";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    void loadMembers();
  }, [open, loadMembers]);

  const filteredMembers = React.useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.full_name.toLowerCase().includes(normalized) ||
        (member.email ?? "").toLowerCase().includes(normalized) ||
        (member.role ?? "").toLowerCase().includes(normalized)
      );
    });
  }, [members, search]);

  const handleToggleReviewer = async (personId: string, isReviewer: boolean) => {
    const previousMembers = members;
    setUpdatingPersonId(personId);
    setMembers((current) =>
      current.map((member) =>
        member.person_id === personId
          ? {
              ...member,
              is_reviewer: isReviewer,
              reviewer_source: isReviewer ? "manual" : "none",
            }
          : member,
      ),
    );

    try {
      const response = await fetch(
        `/api/projects/${projectId}/change-orders/reviewer-settings`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            person_id: personId,
            is_reviewer: isReviewer,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        setMembers(previousMembers);
        toast.error(payload.error || "Failed to update reviewer setting");
        return;
      }

      toast.success("Reviewer setting updated");
      await loadMembers();
    } catch (error) {
      setMembers(previousMembers);
      const message =
        error instanceof Error ? error.message : "Failed to update reviewer setting";
      toast.error(message);
    } finally {
      setUpdatingPersonId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          Reviewers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Change Order Reviewer Settings</DialogTitle>
          <DialogDescription>
            Project admins are always reviewers. Use this list to assign additional
            reviewers.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search members by name, email, or role"
          />
        </div>

        <div className="max-h-[420px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Reviewer Type</TableHead>
                <TableHead className="text-right">Can Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center">
                    <span className="inline-flex items-center text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading members...
                    </span>
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No matching members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => {
                  const disabled = member.is_admin || updatingPersonId === member.person_id;
                  return (
                    <TableRow key={member.person_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{member.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {member.email || "No email"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{member.role || "Member"}</TableCell>
                      <TableCell>
                        {member.reviewer_source === "admin" ? (
                          <Badge>Admin</Badge>
                        ) : member.reviewer_source === "manual" ? (
                          <Badge variant="secondary">Manual</Badge>
                        ) : (
                          <Badge variant="outline">None</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Switch
                          checked={member.is_reviewer}
                          disabled={disabled}
                          onCheckedChange={(checked) =>
                            void handleToggleReviewer(member.person_id, checked)
                          }
                          aria-label={`Toggle reviewer for ${member.full_name}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
