"use client";

import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PersonWithDetails } from "@/components/directory/DirectoryFilters";

interface InviteDialogProps {
  person: PersonWithDetails | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Render a modal dialog to send or resend a project invitation to a given person.
 *
 * @param person - The recipient's details; when `null` the component renders `null`.
 * @param projectId - ID of the project used to construct the invite API endpoint.
 * @param open - Whether the dialog is open.
 * @param onOpenChange - Callback invoked with the new open state when the dialog should close or open.
 * @param onSuccess - Optional callback invoked after a successful invite or reinvite.
 * @returns The dialog JSX when `person` is provided; `null` otherwise.
 */
export function InviteDialog({
  person,
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: InviteDialogProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isReinvite = person?.membership?.invite_status === "invited";

  const handleSend = async () => {
    if (!person) return;

    setSending(true);
    setError(null);

    try {
      const endpoint = isReinvite
        ? `/api/projects/${projectId}/directory/people/${person.id}/reinvite`
        : `/api/projects/${projectId}/directory/people/${person.id}/invite`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send invitation");
      }

      toast.success(
        `Invitation ${isReinvite ? "resent" : "sent"} to ${person.email}`,
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);

      toast.error("Could not send invitation", { description: message });
    } finally {
      setSending(false);
    }
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReinvite ? "Resend Invitation" : "Send Invitation"}
          </DialogTitle>
          <DialogDescription>
            {isReinvite
              ? `Resend the project invitation to ${person.first_name} ${person.last_name}`
              : `Send a project invitation to ${person.first_name} ${person.last_name}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Recipient Info */}
          <div className="space-y-2">
            <Label>Recipient</Label>
            <div className="rounded-md border bg-muted/50 p-4">
              <div className="font-medium">
                {person.first_name} {person.last_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {person.email}
              </div>
              {person.company && (
                <div className="text-sm text-muted-foreground">
                  {person.company.name}
                </div>
              )}
            </div>
          </div>

          {/* Permission Template */}
          {person.permission_template && (
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <div className="rounded-md border bg-muted/50 p-4">
                <div className="font-medium">
                  {person.permission_template.name}
                </div>
                {person.permission_template.description && (
                  <div className="text-sm text-muted-foreground">
                    {person.permission_template.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div className="space-y-2">
            <Label htmlFor="custom-message">Custom Message (Optional)</Label>
            <Textarea
              id="custom-message"
              placeholder="Add a personal message to include in the invitation email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {isReinvite
                ? "A new invitation link will be sent to the recipient's email address."
                : "An invitation email will be sent with a secure link to join the project."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !person.email}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Mail />
            {isReinvite ? "Resend Invitation" : "Send Invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
