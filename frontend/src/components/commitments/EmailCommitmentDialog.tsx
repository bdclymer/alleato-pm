"use client";

import * as React from "react";
import { Mail, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useCompanyContacts } from "@/hooks/use-company-contacts";

/**
 * EmailCommitmentDialog props interface
 */
interface EmailCommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commitmentId: string;
  commitmentNumber?: string;
  commitmentTitle?: string;
  companyId?: string;
  companyName?: string;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
  type: "contact" | "manual";
}

/**
 * EmailCommitmentDialog - Dialog for emailing commitment details to contacts
 *
 * Allows users to send commitment details via email to selected company contacts
 * or manually entered email addresses. Includes options for attaching PDF and
 * adding a custom message.
 *
 * @example
 * ```tsx
 * <EmailCommitmentDialog
 *   open={isEmailOpen}
 *   onOpenChange={setIsEmailOpen}
 *   commitmentId="uuid-123"
 *   commitmentNumber="SC-001"
 *   commitmentTitle="Electrical Work"
 *   companyId="company-uuid"
 *   companyName="ABC Electrical"
 * />
 * ```
 */
export function EmailCommitmentDialog({
  open,
  onOpenChange,
  commitmentId,
  commitmentNumber,
  commitmentTitle,
  companyId,
  companyName,
}: EmailCommitmentDialogProps) {
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [manualEmail, setManualEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [attachPdf, setAttachPdf] = React.useState(true);
  const [includeSovItems, setIncludeSovItems] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  // Fetch company contacts
  const { contacts, isLoading: contactsLoading } = useCompanyContacts({
    companyId,
    enabled: open && !!companyId,
  });

  // Set default subject when dialog opens
  React.useEffect(() => {
    if (open) {
      const commitmentLabel = commitmentNumber || "Commitment";
      setSubject(`${commitmentLabel} - ${commitmentTitle || "Contract Details"}`);
      setMessage("");
      setRecipients([]);
      setManualEmail("");
      setAttachPdf(true);
      setIncludeSovItems(true);
      setEmailError(null);
    }
  }, [open, commitmentNumber, commitmentTitle]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addManualEmail = () => {
    const email = manualEmail.trim();
    if (!email) return;

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Check for duplicates
    if (recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      setEmailError("This email address has already been added");
      return;
    }

    setRecipients([
      ...recipients,
      {
        id: `manual-${Date.now()}`,
        email,
        name: email,
        type: "manual",
      },
    ]);
    setManualEmail("");
    setEmailError(null);
  };

  const addContact = (contact: { id: string; first_name: string; last_name: string; email: string | null }) => {
    if (!contact.email) return;

    // Check for duplicates
    if (recipients.some((r) => r.email.toLowerCase() === contact.email!.toLowerCase())) {
      return;
    }

    const name = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email;

    setRecipients([
      ...recipients,
      {
        id: contact.id,
        email: contact.email,
        name,
        type: "contact",
      },
    ]);
  };

  const removeRecipient = (id: string) => {
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
      setEmailError("Please add at least one recipient");
      return;
    }

    if (!subject.trim()) {
      setEmailError("Please enter a subject");
      return;
    }

    setIsSending(true);
    setEmailError(null);

    try {
      const response = await fetch(`/api/commitments/${commitmentId}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: recipients.map((r) => ({
            email: r.email,
            name: r.name,
          })),
          subject: subject.trim(),
          message: message.trim(),
          attach_pdf: attachPdf,
          include_sov_items: includeSovItems,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to send email`);
      }

      const result = await response.json();

      toast.success(
        `Email sent successfully to ${recipients.length} recipient${recipients.length > 1 ? "s" : ""}`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send email"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addManualEmail();
    }
  };

  // Filter out contacts that are already added as recipients
  const availableContacts = contacts.filter(
    (c) => c.email && !recipients.some((r) => r.email.toLowerCase() === c.email!.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Commitment</DialogTitle>
          <DialogDescription>
            Send {commitmentNumber || "this commitment"} details via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipients Section */}
          <div className="space-y-4">
            <Label>Recipients</Label>

            {/* Selected Recipients */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 p-2 rounded-md border bg-muted/30">
                {recipients.map((recipient) => (
                  <Badge
                    key={recipient.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span className="max-w-[200px] truncate">{recipient.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRecipient(recipient.id)}
                      className="ml-1 h-4 w-4 rounded-full p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add Manual Email */}
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address..."
                value={manualEmail}
                onChange={(e) => {
                  setManualEmail(e.target.value);
                  setEmailError(null);
                }}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addManualEmail}
                disabled={!manualEmail.trim()}
              >
                Add
              </Button>
            </div>

            {/* Company Contacts Quick Add */}
            {companyId && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  {companyName ? `Contacts from ${companyName}` : "Company Contacts"}
                </Label>
                {contactsLoading ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading contacts...
                  </div>
                ) : availableContacts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {availableContacts.slice(0, 6).map((contact) => (
                      <Button
                        key={contact.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addContact(contact)}
                        className="text-xs"
                      >
                        + {contact.first_name} {contact.last_name}
                      </Button>
                    ))}
                    {availableContacts.length > 6 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{availableContacts.length - 6} more
                      </span>
                    )}
                  </div>
                ) : contacts.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All contacts have been added
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No contacts found for this company
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="email-message">Message (Optional)</Label>
            <Textarea
              id="email-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message to include in the email..."
              rows={4}
            />
          </div>

          {/* Options */}
          <div className="space-y-4">
            <Label>Email Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="attach-pdf"
                  checked={attachPdf}
                  onCheckedChange={(checked) => setAttachPdf(checked === true)}
                />
                <Label
                  htmlFor="attach-pdf"
                  className="font-normal cursor-pointer"
                >
                  Attach commitment PDF
                </Label>
              </div>
              {attachPdf && (
                <div className="flex items-center space-x-2 ml-6">
                  <Checkbox
                    id="include-sov"
                    checked={includeSovItems}
                    onCheckedChange={(checked) =>
                      setIncludeSovItems(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-sov"
                    className="font-normal cursor-pointer text-sm"
                  >
                    Include Schedule of Values in PDF
                  </Label>
                </div>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {emailError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{emailError}</AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Recipients will receive an email with commitment details
              {attachPdf && " and a PDF attachment"}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || recipients.length === 0}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
