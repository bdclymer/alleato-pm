"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarIcon,
  ClockIcon,
  Cross2Icon,
  DotsHorizontalIcon,
  EnvelopeClosedIcon,
  FileTextIcon,
  Link2Icon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  PlusIcon,
  StarFilledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

import { StatusBadge } from "@/components/ds";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ProjectEmail } from "@/hooks/use-emails";
import {
  EmailDetailSheet,
  projectEmailToDetailRecord,
} from "@/features/emails/email-detail-sheet";

interface WorkspaceTab {
  label: string;
  href: string;
  isActive?: boolean;
}

interface ProjectEmailsWorkspaceProps {
  emails: ProjectEmail[];
  isLoading: boolean;
  error?: Error | null;
  tabs: WorkspaceTab[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange: (status?: string) => void;
  onCompose: () => void;
  onEdit: (email: ProjectEmail) => void;
  onDelete: (email: ProjectEmail) => void;
}

const statusOptions = [
  { label: "Received", value: "Received" },
  { label: "Sent", value: "Sent" },
  { label: "All mail", value: undefined },
  { label: "Drafts", value: "Draft" },
];

function formatPaneTimestamp(value: string | null | undefined): string {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const sameDay =
    sameYear &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function formatLongTimestamp(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRecipientLine(recipients: string[] | null | undefined): string {
  if (!recipients || recipients.length === 0) return "No recipients";
  return recipients.join(", ");
}

function plainTextBody(email: ProjectEmail): string {
  const source = email.body?.trim() || email.body_html?.replace(/<[^>]+>/g, " ").trim() || "";
  return source.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

function previewText(email: ProjectEmail): string {
  const body = plainTextBody(email).replace(/\s+/g, " ").trim();
  if (body.length > 120) return `${body.slice(0, 117)}...`;
  return body || "No message preview yet.";
}

function getInitials(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "EM";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function resolvePrimaryContact(email: ProjectEmail): {
  displayName: string;
  roleLabel: string;
  linkLabel: string | null;
} {
  const isReceived = email.status === "Received";
  const recipients = (email.to_list ?? []).map((recipient) => recipient.trim()).filter(Boolean);

  if (isReceived) {
    const displayName = email.from_name?.trim() || email.from_email?.trim() || "Project sender";

    return {
      displayName,
      roleLabel: "Sender",
      linkLabel: email.from_email?.trim() || null,
    };
  }

  const primaryRecipient = recipients[0] || "No recipient";

  return {
    displayName: primaryRecipient,
    roleLabel: "Recipient",
    linkLabel: primaryRecipient,
  };
}

function buildContextItems(email: ProjectEmail): Array<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> {
  const directionItem =
    email.status === "Received"
      ? {
          icon: <EnvelopeClosedIcon className="h-4 w-4" />,
          label: "From",
          value: email.from_email?.trim() || email.from_name?.trim() || "Not provided",
        }
      : {
          icon: <PaperPlaneIcon className="h-4 w-4" />,
          label: "To",
          value: formatRecipientLine(email.to_list),
        };

  return [
    directionItem,
    {
      icon: <CalendarIcon className="h-4 w-4" />,
      label: "Created",
      value: formatLongTimestamp(email.created_at),
    },
    {
      icon: <ClockIcon className="h-4 w-4" />,
      label: email.status === "Received" ? "Received" : "Sent",
      value: formatLongTimestamp(email.received_at || email.sent_at || email.created_at),
    },
  ];
}

function InboxRow({
  email,
  isActive,
  onSelect,
}: {
  email: ProjectEmail;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      onClick={onSelect}
      variant="ghost"
      className={cn(
        "group h-auto w-full justify-start rounded-none border-l-2 px-5 py-3.5 text-left transition-colors duration-200",
        isActive
          ? "border-primary bg-primary/5"
          : "border-transparent hover:bg-accent/50",
      )}
    >
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-semibold text-foreground">
              {email.from_name || email.from_email || "Unknown sender"}
            </div>
            <div className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {formatPaneTimestamp(email.received_at || email.sent_at || email.created_at)}
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {email.subject || "Untitled email"}
            </p>
            {email.is_starred ? (
              <StarFilledIcon className="h-3.5 w-3.5 shrink-0 text-status-warning" />
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            {previewText(email)}
          </p>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <StatusBadge status={email.status} />
            {email.has_attachments ? (
              <span className="inline-flex items-center gap-1">
                <FileTextIcon className="h-3.5 w-3.5" />
                Attachment
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Button>
  );
}

function EmailDetailsPanel({
  selectedEmail,
  primaryContact,
  contextItems,
  className,
  onClose,
}: {
  selectedEmail: ProjectEmail | null;
  primaryContact: ReturnType<typeof resolvePrimaryContact> | null;
  contextItems: Array<{
    icon: React.ReactNode;
    label: string;
    value: string;
  }>;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="px-6 py-6">
        {selectedEmail && primaryContact ? (
          <>
            {onClose ? (
              <div className="mb-4 flex items-center justify-end 2xl:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close details panel"
                  className="h-8 w-8 rounded-full text-muted-foreground"
                >
                  <Cross2Icon className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <div className="space-y-5 border-b border-border/70 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border border-border/70">
                      <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                        {getInitials(primaryContact.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-semibold break-all text-foreground [overflow-wrap:anywhere]">
                        {primaryContact.displayName}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {primaryContact.roleLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {primaryContact.linkLabel ? (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="inline-flex items-start gap-2">
                    <Link2Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-all [overflow-wrap:anywhere]">
                      {primaryContact.linkLabel}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4 py-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Message context
              </div>
              {contextItems.map((item) => (
                <div key={item.label} className="flex gap-3 text-sm">
                  <div className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</div>
                  <div className="min-w-0">
                    <div className="text-muted-foreground">{item.label}</div>
                    <div className="mt-1 break-all text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 border-t border-border/70 pt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Related
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedEmail.related_tool ? (
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {selectedEmail.related_tool}
                  </span>
                ) : null}
                {selectedEmail.distribution_group ? (
                  <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    {selectedEmail.distribution_group}
                  </span>
                ) : null}
                {!selectedEmail.related_tool && !selectedEmail.distribution_group ? (
                  <span className="text-sm text-muted-foreground">No linked workflow metadata yet.</span>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              Workspace notes
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: <EnvelopeClosedIcon className="h-4 w-4" />,
                  title: "Inbox",
                  body: "Incoming and draft messages stay in the left rail so the main thread remains quiet and readable.",
                },
                {
                  icon: <MixerHorizontalIcon className="h-4 w-4" />,
                  title: "Filters",
                  body: "Use search and status chips to narrow the workspace without dropping back into a generic table.",
                },
                {
                  icon: <FileTextIcon className="h-4 w-4" />,
                  title: "Context",
                  body: "Sender, recipients, timestamps, and linked workflow metadata stay pinned on the right.",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="mt-1 text-muted-foreground">{item.icon}</div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{item.title}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export function ProjectEmailsWorkspace({
  emails,
  isLoading,
  error,
  tabs,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onCompose,
  onEdit,
  onDelete,
}: ProjectEmailsWorkspaceProps) {
  const [selectedEmailId, setSelectedEmailId] = React.useState<number | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = React.useState(false);

  React.useEffect(() => {
    if (emails.length === 0) {
      setSelectedEmailId(null);
      return;
    }

    setSelectedEmailId((current) => {
      if (current && emails.some((email) => email.id === current)) return current;
      return emails[0]?.id ?? null;
    });
  }, [emails]);

  const selectedEmail = React.useMemo(
    () => emails.find((email) => email.id === selectedEmailId) ?? null,
    [emails, selectedEmailId],
  );

  const selectedBody = React.useMemo(
    () => (selectedEmail ? plainTextBody(selectedEmail) : ""),
    [selectedEmail],
  );

  const contextItems = React.useMemo(
    () => (selectedEmail ? buildContextItems(selectedEmail) : []),
    [selectedEmail],
  );

  const primaryContact = React.useMemo(
    () => (selectedEmail ? resolvePrimaryContact(selectedEmail) : null),
    [selectedEmail],
  );

  const selectedEmailDetail = React.useMemo(
    () => (selectedEmail ? projectEmailToDetailRecord(selectedEmail) : null),
    [selectedEmail],
  );

  const handleSelectEmail = React.useCallback((email: ProjectEmail) => {
    setSelectedEmailId(email.id);
    setIsDetailsPanelOpen(true);
  }, []);

  return (
    <div className="relative flex min-h-[calc(100dvh-8.5rem)] flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(0,1fr)_20rem]">
        <div className="min-h-0 border-b border-border/70 xl:border-b-0 xl:border-r">
          <div className="space-y-4 border-b border-border/70 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "border-b pb-2 transition-colors",
                      tab.isActive
                        ? "border-primary text-foreground"
                        : "border-transparent hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCompose}
                aria-label="Compose"
                title="Compose"
                className="h-8 w-8 rounded-full text-muted-foreground shadow-none"
              >
                <Pencil1Icon className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search project email"
                className="h-11 rounded-full border-border bg-muted/40 pl-10 pr-4 shadow-none focus-visible:ring-1"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {statusOptions.map((option) => {
                const isActive = statusFilter === option.value;
                return (
                  <Button
                    key={option.label}
                    type="button"
                    variant={isActive ? "default" : "secondary"}
                    size="xs"
                    onClick={() => onStatusFilterChange(option.value)}
                    className={cn(
                      "rounded-full px-3 py-1.5 transition-colors",
                      !isActive && "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <ScrollArea className="xl:h-full" style={{ height: "28rem" }}>
            {isLoading ? (
              <div className="space-y-3 px-4 py-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-3 border-l-2 border-transparent px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="px-6 py-10">
                <div className="rounded-3xl border border-red-200 bg-red-50/60 p-5 text-sm text-red-700">
                  <div className="font-semibold text-red-900">Could not load email</div>
                  <p className="mt-2 leading-6">{error.message}</p>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="px-6 py-10 text-sm text-muted-foreground">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <EnvelopeClosedIcon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-lg font-semibold tracking-[-0.02em] text-foreground">
                  Inbox ready
                </div>
                <p className="mt-2 max-w-xs leading-6">
                  Draft client updates, track incoming messages, and keep project conversations in one quiet workspace.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCompose}
                  className="mt-6 h-10 rounded-full px-4 shadow-none"
                >
                  Start a draft
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {emails.map((email) => (
                  <InboxRow
                    key={email.id}
                    email={email}
                    isActive={selectedEmail?.id === email.id}
                    onSelect={() => handleSelectEmail(email)}
                  />
                ))}
              </motion.div>
            )}
          </ScrollArea>
        </div>

        <div className="min-h-0 border-b border-border/70 xl:border-b-0 xl:border-r 2xl:border-r">
          <AnimatePresence mode="wait">
            {selectedEmail ? (
              <motion.div
                key={selectedEmail.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex h-full flex-col"
                style={{ minHeight: "30rem" }}
              >
                <div className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        {selectedEmail.is_starred ? (
                          <StarFilledIcon className="h-4 w-4 text-status-warning" />
                        ) : null}
                        <div className="truncate text-xl font-semibold tracking-[-0.02em] text-foreground">
                          {selectedEmail.subject || "Untitled email"}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {selectedEmail.from_name || "Unknown sender"}
                        </span>
                        <span>{selectedEmail.from_email || "No sender email"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDetailsPanelOpen(true)}
                        aria-label="Open email content panel"
                        className="hidden h-9 w-9 rounded-full text-muted-foreground xl:inline-flex 2xl:hidden"
                      >
                        <MixerHorizontalIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(selectedEmail)}
                        className="rounded-full border border-transparent"
                        aria-label="Edit email"
                      >
                        <Pencil1Icon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(selectedEmail)}
                        className="rounded-full border border-transparent"
                        aria-label="Delete email"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full border border-transparent"
                        aria-label="More actions"
                      >
                        <DotsHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="flex flex-col gap-4 px-6 pb-6 pt-4">
                    <div className="rounded-md border border-border/70 bg-background p-5 shadow-none">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-base font-semibold text-foreground">
                            {selectedEmail.from_name || selectedEmail.from_email || "Unknown sender"}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            to {formatRecipientLine(selectedEmail.to_list)}
                          </div>
                        </div>
                        <div className="shrink-0 text-sm text-muted-foreground">
                          {formatPaneTimestamp(selectedEmail.received_at || selectedEmail.sent_at || selectedEmail.created_at)}
                        </div>
                      </div>

                      <div className="mt-4 space-y-4 text-[15px] leading-7 text-foreground">
                        {selectedBody ? (
                          selectedBody.split(/\n{2,}/).map((paragraph, index) => (
                            <p key={`${selectedEmail.id}-paragraph-${index}`}>{paragraph}</p>
                          ))
                        ) : (
                          <p className="text-muted-foreground">This draft does not have body copy yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      {[
                        selectedEmail.status === "Draft" ? "Open draft" : "Reply",
                        "Mark important",
                        "Share update",
                      ].map((label) => (
                        <Button
                          key={label}
                          type="button"
                          variant="link"
                          className="h-auto px-0 text-sm text-muted-foreground"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="empty-detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full items-center justify-center px-8 py-10"
                style={{ minHeight: "30rem" }}
              >
                <div className="max-w-md text-center">
                  <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-muted text-muted-foreground">
                    <EnvelopeClosedIcon className="h-6 w-6" />
                  </div>
                  <div className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    Nothing selected
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                    Select a message from the inbox rail or start a new draft. This center pane is where the thread stays in focus.
                  </p>
                  <Button
                    size="sm"
                    onClick={onCompose}
                    className="mt-6 h-10 rounded-full px-4 shadow-none"
                  >
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Compose email
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden min-h-0 2xl:block">
          <EmailDetailsPanel
            selectedEmail={selectedEmail}
            primaryContact={primaryContact}
            contextItems={contextItems}
          />
        </div>
      </div>

      <EmailDetailSheet
        email={selectedEmailDetail}
        open={isDetailsPanelOpen}
        onOpenChange={setIsDetailsPanelOpen}
        actions={
          selectedEmail ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onEdit(selectedEmail)}
                aria-label="Edit email"
                className="h-8 w-8"
              >
                <Pencil1Icon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onDelete(selectedEmail)}
                aria-label="Delete email"
                className="h-8 w-8 text-destructive hover:text-destructive"
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
