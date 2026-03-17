"use client";

import * as React from "react";
import { CheckCircle2, Download, Loader2, Mail, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocumentRecordType } from "@/lib/documents/record-documents";

interface RecipientOption {
  id: string;
  email: string;
  name: string;
  source: string;
  defaultSelected: boolean;
}

interface Recipient {
  id: string;
  email: string;
  name: string;
}

type DialogTab = "download" | "email";

interface DocumentDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: DocumentRecordType;
  recordId: string;
  title: string;
  number: string;
  initialTab?: DialogTab;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function DocumentDeliveryDialog({
  open,
  onOpenChange,
  recordType,
  recordId,
  title,
  number,
  initialTab = "download",
}: DocumentDeliveryDialogProps) {
  const [activeTab, setActiveTab] = React.useState<DialogTab>(initialTab);
  const [recipientOptions, setRecipientOptions] = React.useState<RecipientOption[]>([]);
  const [recipients, setRecipients] = React.useState<Recipient[]>([]);
  const [manualEmail, setManualEmail] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = React.useState(false);
  const [metadataError, setMetadataError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setActiveTab(initialTab);
    setManualEmail("");
    setMessage("");
    setMetadataError(null);
    setRecipientOptions([]);
    setRecipients([]);
    setSubject(`${number} - ${title}`);

    const loadRecipients = async () => {
      setIsLoadingRecipients(true);
      try {
        const response = await fetch(
          `/api/document-center/${recordType}/${recordId}/recipients`,
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load recipients");
        }

        const data = (await response.json()) as {
          defaultSubject: string;
          recipients: RecipientOption[];
        };

        if (!isMounted) return;

        setRecipientOptions(data.recipients);
        setRecipients(
          data.recipients
            .filter((recipient) => recipient.defaultSelected)
            .map((recipient) => ({
              id: recipient.id,
              email: recipient.email,
              name: recipient.name,
            })),
        );
        setSubject(data.defaultSubject || `${number} - ${title}`);
      } catch (error) {
        if (!isMounted) return;
        setMetadataError(
          error instanceof Error ? error.message : "Failed to load recipients",
        );
      } finally {
        if (isMounted) {
          setIsLoadingRecipients(false);
        }
      }
    };

    void loadRecipients();

    return () => {
      isMounted = false;
    };
  }, [initialTab, number, open, recordId, recordType, title]);

  const availableRecipients = React.useMemo(
    () =>
      recipientOptions.filter(
        (option) =>
          !recipients.some(
            (recipient) =>
              recipient.email.toLowerCase() === option.email.toLowerCase(),
          ),
      ),
    [recipientOptions, recipients],
  );

  const addRecipient = React.useCallback((recipient: Recipient) => {
    setRecipients((current) => {
      if (
        current.some(
          (item) => item.email.toLowerCase() === recipient.email.toLowerCase(),
        )
      ) {
        return current;
      }
      return [...current, recipient];
    });
  }, []);

  const removeRecipient = React.useCallback((id: string) => {
    setRecipients((current) => current.filter((recipient) => recipient.id !== id));
  }, []);

  const addManualEmail = React.useCallback(() => {
    const email = manualEmail.trim();
    if (!email) return;
    if (!validateEmail(email)) {
      toast.error("Enter a valid email address");
      return;
    }

    addRecipient({
      id: `manual-${email.toLowerCase()}`,
      email,
      name: email,
    });
    setManualEmail("");
  }, [addRecipient, manualEmail]);

  const handleDownload = React.useCallback(async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `/api/document-center/${recordType}/${recordId}/pdf`,
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.match(/filename="?([^"]+)"?/)?.[1] ||
        `${number}-${title}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  }, [number, recordId, recordType, title]);

  const handleSend = React.useCallback(async () => {
    if (recipients.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }

    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/document-center/${recordType}/${recordId}/email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipients,
            subject: subject.trim(),
            message: message.trim(),
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send email");
      }

      toast.success(
        `Email sent to ${recipients.length} recipient${recipients.length === 1 ? "" : "s"}`,
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
    } finally {
      setIsSending(false);
    }
  }, [message, onOpenChange, recipients, recordId, recordType, subject]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Document Delivery</DialogTitle>
          <DialogDescription>
            Generate or email the merged PDF for {number} {title ? `· ${title}` : ""}.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as DialogTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="download">
              <Download className="mr-2 h-4 w-4" />
              Download
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="download" className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">PDF template</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The PDF is generated from the current record fields and line items at download time.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void handleDownload()} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-3">
              <Label>Recipients</Label>
              {recipients.length > 0 ? (
                <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/20 p-3">
                  {recipients.map((recipient) => (
                    <Badge
                      key={recipient.id}
                      variant="secondary"
                      className="flex items-center gap-1 py-1"
                    >
                      <span>{recipient.name}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient(recipient.id)}
                        className="rounded-full p-0.5 transition hover:bg-muted"
                        aria-label={`Remove ${recipient.email}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No recipients selected yet.
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="manual-email">Add Email</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-email"
                  value={manualEmail}
                  onChange={(event) => setManualEmail(event.target.value)}
                  placeholder="name@company.com"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addManualEmail();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addManualEmail}>
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Suggested Contacts</Label>
              {isLoadingRecipients ? (
                <div className="text-sm text-muted-foreground">Loading contacts...</div>
              ) : metadataError ? (
                <div className="text-sm text-destructive">{metadataError}</div>
              ) : availableRecipients.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No related contacts were found. Manual entry is still available.
                </div>
              ) : (
                <div className="space-y-2 rounded-xl border border-border bg-background p-3">
                  {availableRecipients.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition hover:bg-muted/30"
                      onClick={() =>
                        addRecipient({
                          id: option.id,
                          email: option.email,
                          name: option.name,
                        })
                      }
                    >
                      <div>
                        <div className="text-sm font-medium">{option.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.email} · {option.source}
                        </div>
                      </div>
                      {option.defaultSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="document-subject">Subject</Label>
              <Input
                id="document-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="document-message">Message</Label>
              <Textarea
                id="document-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="Optional note to include with the PDF."
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => void handleSend()} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Email
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
