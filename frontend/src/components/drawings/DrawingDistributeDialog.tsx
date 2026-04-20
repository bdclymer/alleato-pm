"use client";

import * as React from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DrawingDistributeDialogProps {
  projectId: string;
  drawingId: string;
  drawingNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DrawingDistributeDialog({
  projectId: _projectId,
  drawingId: _drawingId,
  drawingNumber,
  isOpen,
  onClose,
}: DrawingDistributeDialogProps) {
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState(
    `Drawing Distribution — ${drawingNumber}`,
  );
  const [message, setMessage] = React.useState("");
  const [includeDownloadLink, setIncludeDownloadLink] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync subject when drawingNumber changes
  React.useEffect(() => {
    setSubject(`Drawing Distribution — ${drawingNumber}`);
  }, [drawingNumber]);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setTo("");
      setSubject(`Drawing Distribution — ${drawingNumber}`);
      setMessage("");
      setIncludeDownloadLink(true);
    }
  }, [isOpen, drawingNumber]);

  const hasRecipients = to.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRecipients) return;

    setIsSubmitting(true);
    try {
      // TODO: wire to email API when available
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Distribution sent successfully");
      onClose();
    } catch {
      toast.error("Failed to send distribution");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Distribute Drawing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* To field */}
          <div className="space-y-1.5">
            <Label htmlFor="distribute-to" className="text-xs">
              To <span className="text-destructive">*</span>
            </Label>
            <Input
              id="distribute-to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@example.com, another@example.com"
              className="h-8 text-xs"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">
              Separate multiple addresses with commas
            </p>
          </div>

          {/* Subject field */}
          <div className="space-y-1.5">
            <Label htmlFor="distribute-subject" className="text-xs">
              Subject
            </Label>
            <Input
              id="distribute-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Message field */}
          <div className="space-y-1.5">
            <Label htmlFor="distribute-message" className="text-xs">
              Message (optional)
            </Label>
            <Textarea
              id="distribute-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message for recipients…"
              rows={3}
              className="resize-none text-xs"
            />
          </div>

          {/* Include download link checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="distribute-download-link"
              checked={includeDownloadLink}
              onCheckedChange={(checked) =>
                setIncludeDownloadLink(checked === true)
              }
            />
            <Label
              htmlFor="distribute-download-link"
              className="cursor-pointer text-xs font-normal"
            >
              Include download link
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!hasRecipients || isSubmitting}
            >
              <Send className="mr-1.5 h-3.5 w-3.5" />
              {isSubmitting ? "Sending…" : "Distribute"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
