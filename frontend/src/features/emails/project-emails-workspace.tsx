"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  Cross2Icon,
  EnvelopeClosedIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  MixerHorizontalIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  PlusIcon,
  ReloadIcon,
  StarFilledIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { ArrowUpDown, Check, Download, FolderOpen, ImageIcon, ListTodo, Loader2, Paperclip, Plus, Search, Sparkles, Star, StarOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitPage, useSplitPage } from "@/components/ui/split-page";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { cn } from "@/lib/utils";
import type { EmailSource, ProjectEmail } from "@/hooks/use-emails";
import { useProjects } from "@/hooks/use-projects";
import { EmailImportanceFeedbackDialog } from "@/features/emails/email-importance-feedback-dialog";
import type { EmailImportanceFeedbackState } from "@/lib/ai/email-importance-feedback-types";
import {
  EmailDetailSheet,
  projectEmailToDetailRecord,
} from "@/features/emails/email-detail-sheet";
import {
  buildEmailContentBlocks,
  latestReadableMessage,
  type EmailContentBlock,
} from "@/features/emails/email-thread";
import { toast } from "sonner";

const PdfDocument = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod.Document;
  },
  { ssr: false },
);

const PdfPage = dynamic(
  async () => {
    const mod = await import("react-pdf");
    mod.pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return mod.Page;
  },
  { ssr: false },
);

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
  /** Show the All / App / Outlook source toggle (unified Emails view). */
  showSourceFilter?: boolean;
  sourceFilter?: EmailSource;
  onSourceFilterChange?: (source: EmailSource) => void;
  /** Returns false for read-only (Outlook-synced) emails so Edit is hidden. */
  canEdit?: (email: ProjectEmail) => boolean;
  /** Hide the compose affordance on read-only (global / Outlook) surfaces. */
  canCompose?: boolean;
  /** Hide the delete affordance on read-only surfaces. */
  canDelete?: boolean;
  /** Mail / Table / List switcher rendered in the list header. */
  viewSwitcher?: React.ReactNode;
  /** Filter control rendered next to search in the list header. */
  filterControl?: React.ReactNode;
  /** Active sort column id (matches the email table column ids). */
  sortBy?: string;
  /** Active sort direction. */
  sortDirection?: "asc" | "desc";
  /** Called when the user picks a different sort from the rail header. */
  onSortChange?: (sortBy: string, direction: "asc" | "desc") => void;
  onCompose: () => void;
  onEdit: (email: ProjectEmail) => void;
  onDelete: (email: ProjectEmail) => void;
}

interface EmailAttachmentRecord {
  id: number;
  emailId: number;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  contentType: string | null;
  createdAt: string | null;
  textLength: number;
  graphAttachmentId: string | null;
  checksumSha256: string | null;
  attachmentType: string | null;
  attachmentCategory: string | null;
  email: {
    id: number;
    subject: string;
    fromName: string | null;
    fromEmail: string | null;
    receivedAt: string | null;
    sentAt: string | null;
    createdAt: string | null;
  } | null;
}

const ATTACHMENT_TYPES = [
  "Drawings",
  "Submittal",
  "Invoice",
  "Pay App",
  "RFI",
  "Contract",
  "Proposal",
  "Specifications",
  "Photos",
  "Correspondence",
  "Report",
  "Other",
] as const;

// Sort options surfaced in the mail-view rail. Each maps to a (column id,
// direction) pair understood by the shared email table sort state. Newest-first
// is the default so the most recent message is always at the top.
const EMAIL_SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first", sortBy: "sent_at", direction: "desc" as const },
  { value: "date_asc", label: "Oldest first", sortBy: "sent_at", direction: "asc" as const },
  { value: "sender_asc", label: "Sender A–Z", sortBy: "from_name", direction: "asc" as const },
  { value: "subject_asc", label: "Subject A–Z", sortBy: "subject", direction: "asc" as const },
];

function sortSelectionValue(sortBy?: string, direction?: "asc" | "desc"): string {
  const match = EMAIL_SORT_OPTIONS.find(
    (option) => option.sortBy === sortBy && option.direction === direction,
  );
  return match?.value ?? "date_desc";
}

function SortPopover({
  sortBy,
  sortDirection,
  onSortChange,
}: {
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSortChange: (sortBy: string, direction: "asc" | "desc") => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = sortSelectionValue(sortBy, sortDirection);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Sort emails"
          className="h-8 w-8 rounded-full text-muted-foreground shadow-none"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        {EMAIL_SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onSortChange(option.sortBy, option.direction);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-sm transition-colors hover:bg-muted",
              current === option.value ? "font-medium text-foreground" : "text-muted-foreground",
            )}
          >
            {current === option.value && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
            <span className={cn(current !== option.value && "pl-[1.375rem]")}>{option.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function formatPaneTimestamp(value: string | null | undefined): string {
  if (!value) return "No timestamp";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No timestamp";

  const dateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateLabel} ${timeLabel}`;
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

function formatMetaDate(value: string | null | undefined): string {
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
  const source = email.body_text?.trim() || email.body?.trim() || email.body_html?.trim() || "";
  return latestReadableMessage(source);
}

function emailBodyBlocks(email: ProjectEmail): EmailContentBlock[] {
  const source = email.body_text?.trim() || email.body?.trim() || email.body_html?.trim() || "";
  return buildEmailContentBlocks(source);
}

function suggestedTaskTitle(email: ProjectEmail): string {
  const subject = email.subject?.trim();
  if (!subject) return "Follow up on email";
  return subject.length > 160 ? `${subject.slice(0, 157)}...` : subject;
}

function suggestedTaskDescription(email: ProjectEmail): string {
  const sender = email.from_name || email.from_email || "Unknown sender";
  const recipients = formatRecipientLine(email.to_list);
  const timestamp = formatMetaDate(email.received_at || email.sent_at || email.created_at);
  const body = plainTextBody(email).replace(/\s+/g, " ").trim();
  const excerpt = body.length > 1200 ? `${body.slice(0, 1197)}...` : body;

  return [
    `Follow up from email: ${email.subject || "Untitled email"}`,
    `From: ${sender}`,
    `To: ${recipients}`,
    `Date: ${timestamp}`,
    "",
    excerpt || "Add the task details here.",
  ].join("\n");
}

function projectLabel(project: ProjectEmail["project"] | null | undefined): string | null {
  if (!project) return null;
  if (project.project_number && project.name) return `${project.project_number} - ${project.name}`;
  return project.name || project.project_number || `Project ${project.id}`;
}

function attachmentUrl(projectId: number, attachmentId: number): string {
  return `/api/projects/${projectId}/email-attachments/${attachmentId}/download`;
}

function patchAttachmentUrl(projectId: number, attachmentId: number): string {
  return `/api/projects/${projectId}/email-attachments/${attachmentId}`;
}

function previewUrl(projectId: number, attachmentId: number): string {
  return `${attachmentUrl(projectId, attachmentId)}?disposition=inline`;
}

function isImageAttachment(attachment: EmailAttachmentRecord): boolean {
  return (attachment.contentType?.toLowerCase() ?? "").startsWith("image/");
}

function isPdfAttachment(attachment: EmailAttachmentRecord): boolean {
  return (attachment.contentType?.toLowerCase() ?? "").includes("pdf");
}

function isPreviewableAttachment(attachment: EmailAttachmentRecord): boolean {
  return isImageAttachment(attachment) || isPdfAttachment(attachment);
}

function formatBytes(value: number | null): string {
  if (!value) return "Unknown";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildAttachmentTypeOptions(attachments: EmailAttachmentRecord[]): string[] {
  const defaults = [...ATTACHMENT_TYPES];
  const known = new Set(defaults.map((value) => value.toLowerCase()));
  const custom = attachments
    .map((attachment) => attachment.attachmentType?.trim() ?? "")
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .filter((value) => !known.has(value.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return [...defaults, ...custom];
}

function normalizeCustomOption(value: string): string {
  return value.trim().replace(/\s+/g, " ");
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

export function buildContextItems(email: ProjectEmail): Array<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> {
  return [
    {
      icon: <EnvelopeClosedIcon className="h-4 w-4" />,
      label: "From",
      value: email.from_email?.trim() || email.from_name?.trim() || "Not provided",
    },
    {
      icon: <PaperPlaneIcon className="h-4 w-4" />,
      label: "To",
      value: formatRecipientLine(email.to_list),
    },
    {
      icon: <FolderOpen className="h-4 w-4" />,
      label: "Project",
      value: projectLabel(email.project) ?? "No project assigned",
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
  const { onClose } = useSplitPage();

  return (
    <Button
      type="button"
      onClick={() => {
        onSelect();
        onClose();
      }}
      variant="ghost"
      className={cn(
        "group h-auto min-w-0 w-full max-w-full justify-start overflow-hidden rounded-none border-l-2 px-4 py-3 text-left whitespace-normal transition-colors duration-200",
        isActive
          ? "border-primary bg-accent/60"
          : "border-transparent hover:bg-accent/50",
      )}
    >
      <div className="min-w-0 w-full max-w-full flex-1 overflow-hidden space-y-1">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0 truncate text-xs font-semibold leading-4 text-foreground">
            {email.from_name || email.from_email || "Unknown sender"}
          </div>
          <div className="whitespace-nowrap text-[11px] font-medium tabular-nums text-foreground/60">
            {formatPaneTimestamp(email.received_at || email.sent_at || email.created_at)}
          </div>
        </div>
        {email.from_email ? (
          <p className="truncate text-[11px] leading-4 text-muted-foreground">
            {email.from_email}
          </p>
        ) : null}
        <p className="truncate text-xs font-medium leading-4 text-foreground">
          {email.subject || "Untitled email"}
        </p>
        <div className="flex items-center gap-2">
          <p className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground">
            {previewText(email)}
          </p>
          {email.has_attachments ? (
            <FileTextIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : null}
        </div>
      </div>
    </Button>
  );
}

function ProjectAssignmentPopover({
  email,
  variant = "default",
}: {
  email: ProjectEmail;
  variant?: "default" | "toolbar";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { projects, isLoading } = useProjects({ enabled: open, limit: 250 });
  const currentLabel = projectLabel(email.project);

  async function handleSelect(nextProjectId: number) {
    if (nextProjectId === email.project_id) {
      setOpen(false);
      return;
    }

    setSaving(true);
    try {
      await apiFetch<ProjectEmail>(`/api/projects/${email.project_id}/emails/${email.id}`, {
        method: "PUT",
        body: JSON.stringify({ project_id: nextProjectId }),
      });
      setOpen(false);
      router.push(`/${nextProjectId}/emails`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "toolbar" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            className="h-auto max-w-full justify-start gap-1.5 rounded-md px-0 py-0 text-left text-[13px] font-normal text-foreground shadow-none hover:bg-transparent"
          >
            <span className="truncate">{currentLabel ?? "Assign project"}</span>
            {saving ? (
              <ReloadIcon className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            className="h-8 max-w-full justify-start gap-1.5 rounded-full px-3 text-xs font-medium shadow-none"
          >
            {saving ? (
              <ReloadIcon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="truncate">{currentLabel ?? "Assign project"}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading..." : "No projects found."}</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.project_number ?? ""} ${project.name ?? ""}`}
                  onSelect={() => handleSelect(project.id)}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      project.id === email.project_id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">
                    {project.project_number
                      ? `${project.project_number} - ${project.name ?? `Project ${project.id}`}`
                      : (project.name ?? `Project ${project.id}`)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AttachmentTypePopover({
  attachment,
  projectId,
  availableTypes,
  onUpdated,
}: {
  attachment: EmailAttachmentRecord;
  projectId: number;
  availableTypes: string[];
  onUpdated: (attachmentId: number, nextType: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const trimmedSearch = normalizeCustomOption(search);
  const hasExactMatch = availableTypes.some(
    (type) => type.toLowerCase() === trimmedSearch.toLowerCase(),
  );

  const handleChange = async (value: string | null) => {
    const next = value === "__clear__" ? null : value;
    setSaving(true);
    try {
      await apiFetch(patchAttachmentUrl(projectId, attachment.id), {
        method: "PATCH",
        body: JSON.stringify({ attachmentType: next }),
      });
      onUpdated(attachment.id, next);
      setOpen(false);
      setSearch("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          className="h-7 justify-between gap-1 rounded-full px-2.5 text-[11px] font-medium shadow-none"
        >
          <span className={cn("truncate", attachment.attachmentType ? "text-foreground" : "text-muted-foreground")}>
            {attachment.attachmentType ?? "Set type"}
          </span>
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" onOpenAutoFocus={(event) => event.preventDefault()}>
        <Command shouldFilter>
          <CommandInput
            placeholder="Search or create type..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No matching types.</CommandEmpty>
            <CommandGroup>
              {attachment.attachmentType ? (
                <CommandItem value="__clear__" onSelect={() => void handleChange("__clear__")} className="text-muted-foreground">
                  Clear type
                </CommandItem>
              ) : null}
              {trimmedSearch && !hasExactMatch ? (
                <CommandItem value={`create ${trimmedSearch}`} onSelect={() => void handleChange(trimmedSearch)}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Create "{trimmedSearch}"
                </CommandItem>
              ) : null}
              {availableTypes.map((type) => (
                <CommandItem key={type} value={type} onSelect={() => void handleChange(type)}>
                  <Check className={cn("mr-2 h-3.5 w-3.5", attachment.attachmentType === type ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AttachmentPreviewModal({
  attachment,
  projectId,
  open,
  onOpenChange,
}: {
  attachment: EmailAttachmentRecord | null;
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl" className="h-full max-h-screen max-w-5xl overflow-hidden p-0">
        <ModalHeader className="border-b border-border/70 px-6 py-4">
          <ModalTitle>{attachment?.fileName ?? "Attachment preview"}</ModalTitle>
          <ModalDescription>{attachment?.contentType || "Attachment preview"}</ModalDescription>
        </ModalHeader>
        {attachment ? (
          <div className="h-full min-h-0 bg-muted/20">
            {isImageAttachment(attachment) ? (
              <div className="flex h-full items-center justify-center overflow-auto p-6">
                <img
                  src={previewUrl(projectId, attachment.id)}
                  alt={attachment.fileName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : isPdfAttachment(attachment) ? (
              <div className="h-full overflow-auto p-6">
                <PdfDocument
                  file={previewUrl(projectId, attachment.id)}
                  loading={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading preview...</div>}
                  error={<div className="flex h-full items-center justify-center text-sm text-muted-foreground">Preview failed to load.</div>}
                  className="mx-auto flex w-fit flex-col gap-4"
                >
                  <PdfPage
                    pageNumber={1}
                    width={900}
                    renderAnnotationLayer
                    renderTextLayer
                    className="overflow-hidden rounded-md bg-background shadow-sm"
                  />
                </PdfDocument>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No preview is available for this attachment type.
              </div>
            )}
          </div>
        ) : null}
      </ModalContent>
    </Modal>
  );
}

interface EmailReadingPanelProps {
  email: ProjectEmail | null;
  canCompose?: boolean;
  canEditEmail?: boolean;
  canDelete?: boolean;
  onCompose?: () => void;
  onEdit?: (email: ProjectEmail) => void;
  onDelete?: (email: ProjectEmail) => void;
  showDetailsButton?: boolean;
  onOpenDetails?: () => void;
  importanceFeedback?: EmailImportanceFeedbackState | null;
  onImportanceRecorded?: (
    emailId: number,
    feedback: EmailImportanceFeedbackState,
  ) => void;
  className?: string;
}

interface EmailActionControlsProps {
  onSummarize: () => void;
  onImportanceIntent: (signal: "important" | "not_important") => void;
  onCreateTask: () => void;
  className?: string;
  orientation?: "row" | "column";
}

function EmailActionControls({
  onSummarize,
  onImportanceIntent,
  onCreateTask,
  className,
  orientation = "row",
}: EmailActionControlsProps) {
  return (
    <div
      className={cn(
        orientation === "column"
          ? "flex flex-col items-stretch gap-1"
          : "flex flex-wrap items-center gap-1.5",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onSummarize}
        className={cn(
          "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          orientation === "column" && "justify-start",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Summarize
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onImportanceIntent("important")}
        className={cn(
          "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          orientation === "column" && "justify-start",
        )}
      >
        <Star className="h-3.5 w-3.5" />
        Mark important
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onImportanceIntent("not_important")}
        className={cn(
          "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          orientation === "column" && "justify-start",
        )}
      >
        <StarOff className="h-3.5 w-3.5" />
        Not important
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCreateTask}
        className={cn(
          "h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground",
          orientation === "column" && "justify-start",
        )}
      >
        <ListTodo className="h-3.5 w-3.5" />
        Create task
      </Button>
    </div>
  );
}

export function EmailReadingPanel({
  email,
  canCompose = true,
  canEditEmail = false,
  canDelete = true,
  onCompose,
  onEdit,
  onDelete,
  showDetailsButton = false,
  onOpenDetails,
  importanceFeedback = null,
  onImportanceRecorded,
  className,
}: EmailReadingPanelProps) {
  const router = useRouter();
  const [importanceDialogOpen, setImportanceDialogOpen] = React.useState(false);
  const [importanceSignal, setImportanceSignal] = React.useState<"important" | "not_important" | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [taskTitle, setTaskTitle] = React.useState("");
  const [taskDescription, setTaskDescription] = React.useState("");
  const [taskPriority, setTaskPriority] = React.useState<"high" | "medium" | "low">("medium");
  const [taskStatus, setTaskStatus] = React.useState<"open" | "in_progress" | "blocked">("open");
  const [taskDueDate, setTaskDueDate] = React.useState("");
  const [isCreatingTask, setIsCreatingTask] = React.useState(false);
  const [previewAttachment, setPreviewAttachment] = React.useState<EmailAttachmentRecord | null>(null);
  const [attachmentOverrides, setAttachmentOverrides] = React.useState<Record<number, string | null>>({});
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);
  const [desktopActionsSlot, setDesktopActionsSlot] =
    React.useState<HTMLElement | null>(null);

  const selectedBody = React.useMemo(
    () => (email ? plainTextBody(email) : ""),
    [email],
  );
  const selectedBodyBlocks = React.useMemo(
    () => (email ? emailBodyBlocks(email) : []),
    [email],
  );
  const { data: projectAttachments = [] } = useQuery<EmailAttachmentRecord[]>({
    queryKey: ["email-attachments", email?.project_id],
    queryFn: ({ signal }) =>
      apiFetch<EmailAttachmentRecord[]>(
        `/api/projects/${email?.project_id}/email-attachments`,
        { signal },
      ),
    enabled: Boolean(email?.project_id),
  });
  const selectedAttachments = React.useMemo(
    () =>
      projectAttachments
        .filter((attachment) => attachment.emailId === email?.id)
        .map((attachment) => ({
          ...attachment,
          attachmentType:
            attachmentOverrides[attachment.id] !== undefined
              ? attachmentOverrides[attachment.id]
              : attachment.attachmentType,
        })),
    [attachmentOverrides, projectAttachments, email?.id],
  );
  const attachmentTypeOptions = React.useMemo(
    () => buildAttachmentTypeOptions(projectAttachments),
    [projectAttachments],
  );

  const handleImportanceIntent = React.useCallback(
    (signal: "important" | "not_important") => {
      setImportanceSignal(signal);
      setImportanceDialogOpen(true);
    },
    [],
  );

  const handleAttachmentTypeUpdate = React.useCallback(
    (attachmentId: number, nextType: string | null) => {
      setAttachmentOverrides((current) => ({ ...current, [attachmentId]: nextType }));
    },
    [],
  );

  React.useEffect(() => {
    setSummaryOpen(false);
    setSummary(null);
    setSummaryLoading(false);
  }, [email?.id]);

  React.useEffect(() => {
    setDesktopActionsSlot(document.getElementById("email-details-actions-slot"));
  }, [email?.id]);

  const handleSummarize = React.useCallback(async () => {
    if (!email) return;
    setSummaryOpen(true);
    if (summary) return;
    setSummaryLoading(true);
    try {
      const result = await apiFetch<{ summary: string }>(
        `/api/projects/${email.project_id}/emails/${email.id}/summarize`,
        { method: "POST" },
      );
      setSummary(result.summary);
    } catch (error) {
      setSummary(
        error instanceof Error
          ? `Could not generate summary: ${error.message}`
          : "Could not generate summary.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [email, summary]);

  const handleOpenCreateTask = React.useCallback(() => {
    if (!email) return;
    setTaskTitle(suggestedTaskTitle(email));
    setTaskDescription(suggestedTaskDescription(email));
    setTaskPriority("medium");
    setTaskStatus("open");
    setTaskDueDate("");
    setCreateTaskOpen(true);
  }, [email]);

  const handleCreateTask = React.useCallback(async () => {
    if (!email) return;

    const trimmedTitle = taskTitle.trim();
    const trimmedDescription = taskDescription.trim();

    if (!trimmedTitle || !trimmedDescription) {
      toast.error("Task title and description are required.");
      return;
    }

    setIsCreatingTask(true);
    try {
      await apiFetch(`/api/projects/${email.project_id}/emails/${email.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDescription,
          dueDate: taskDueDate || null,
          priority: taskPriority,
          status: taskStatus,
        }),
      });
      setCreateTaskOpen(false);
      toast.success("Task created from email.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error && /already exists/i.test(error.message)
          ? "A matching task already exists for this email."
          : error instanceof Error
            ? error.message
            : "Could not create task from email.";
      toast.error(message);
    } finally {
      setIsCreatingTask(false);
    }
  }, [router, email, taskDescription, taskDueDate, taskPriority, taskStatus, taskTitle]);

  return (
    <>
      <AnimatePresence mode="wait">
        {email ? (
          <motion.div
            key={email.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={cn("flex h-full flex-col", className)}
            style={{ minHeight: "30rem" }}
          >
            <div className="border-b border-border/70 px-8 py-4 xl:px-10">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-4">
                    <div className="min-w-0 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-foreground">
                      {email.subject || "Untitled email"}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-right text-[12px] text-muted-foreground">
                      {formatMetaDate(
                        email.received_at ||
                          email.sent_at ||
                          email.created_at,
                      )}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-y-1.5 text-[13px] text-muted-foreground sm:grid-cols-[3.25rem_minmax(0,1fr)] sm:gap-x-3">
                    <span className="font-medium text-foreground/75">From</span>
                    <span className="min-w-0 truncate text-foreground">
                      <span className="font-medium">{email.from_name || "Unknown sender"}</span>
                      {email.from_email ? `  ${email.from_email}` : ""}
                    </span>
                    <span className="font-medium text-foreground/75">To</span>
                    <span className="min-w-0 truncate text-foreground">
                      {formatRecipientLine(email.to_list)}
                    </span>
                    <span className="font-medium text-foreground/75">Project</span>
                    <ProjectAssignmentPopover email={email} variant="toolbar" />
                  </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  {showDetailsButton && onOpenDetails ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onOpenDetails}
                      aria-label="Open email content panel"
                      className="hidden h-8 w-8 rounded-full text-muted-foreground xl:inline-flex 2xl:hidden"
                    >
                      <MixerHorizontalIcon className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canEditEmail && onEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(email)}
                      className="h-8 w-8 rounded-full"
                      aria-label="Edit email"
                    >
                      <Pencil1Icon className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDelete && onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(email)}
                      className="h-8 w-8 rounded-full"
                      aria-label="Delete email"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {summaryOpen ? (
              <InfoAlert
                role="status"
                icon={<Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
                className="items-start gap-2 rounded-none border-x-0 border-t-0 border-b border-border/60 bg-muted/30 px-8 py-3 text-muted-foreground [&>div]:flex-1 xl:px-10"
              >
                <div className="flex w-full items-start gap-2">
                  {summaryLoading ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Summarizing…
                    </span>
                  ) : (
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                      {summary}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSummaryOpen(false)}
                    aria-label="Close summary"
                    className="size-6 shrink-0 text-muted-foreground"
                  >
                    <Cross2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </InfoAlert>
            ) : null}

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-8 px-8 pb-8 pt-8 xl:px-10">
                <div className="space-y-4 text-[14px] leading-6 text-foreground [overflow-wrap:anywhere]">
                  {selectedBody ? (
                    selectedBodyBlocks.map((block) => {
                      if (block.kind === "metadata" || block.kind === "quote-header") {
                        return null;
                      }

                      if (block.kind === "warning") {
                        return (
                          <div
                            key={block.id}
                            className="inline-flex rounded-full bg-warning/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-warning-foreground"
                          >
                            {block.lines.join(" ")}
                          </div>
                        );
                      }

                      return (
                        <div key={block.id} className="space-y-3">
                          {block.lines.map((line) => (
                            <p key={`${block.id}-${line}`} className="whitespace-pre-wrap break-words">
                              {line}
                            </p>
                          ))}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-muted-foreground">This draft does not have body copy yet.</p>
                  )}
                </div>

                {selectedAttachments.length > 0 ? (
                  <div className="space-y-3 border-t border-border/60 pt-5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      {selectedAttachments.length}{" "}
                      {selectedAttachments.length === 1 ? "Attachment" : "Attachments"}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedAttachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="space-y-3 rounded-2xl border border-border/70 p-3"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPreviewAttachment(attachment)}
                            disabled={!isPreviewableAttachment(attachment)}
                            aria-label={`Preview ${attachment.fileName}`}
                            className={cn(
                              "flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-muted/30 p-0 disabled:opacity-100",
                              isPreviewableAttachment(attachment) && "hover:bg-muted/50",
                            )}
                          >
                            {isImageAttachment(attachment) ? (
                              <img
                                src={previewUrl(email.project_id, attachment.id)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : isPdfAttachment(attachment) ? (
                              <PdfDocument
                                file={previewUrl(email.project_id, attachment.id)}
                                loading={<FileTextIcon className="h-5 w-5 text-muted-foreground" />}
                                error={<FileTextIcon className="h-5 w-5 text-muted-foreground" />}
                              >
                                <PdfPage pageNumber={1} width={160} renderAnnotationLayer={false} renderTextLayer={false} />
                              </PdfDocument>
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </Button>
                          <div className="space-y-1">
                            <div className="truncate text-sm font-medium text-foreground">
                              {attachment.fileName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatBytes(attachment.fileSize)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <AttachmentTypePopover
                              attachment={attachment}
                              projectId={email.project_id}
                              availableTypes={attachmentTypeOptions}
                              onUpdated={handleAttachmentTypeUpdate}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                              onClick={() =>
                                window.open(
                                  attachmentUrl(email.project_id, attachment.id),
                                  "_blank",
                                )
                              }
                              aria-label={`Download ${attachment.fileName}`}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <EmailActionControls
                  onSummarize={() => void handleSummarize()}
                  onImportanceIntent={handleImportanceIntent}
                  onCreateTask={handleOpenCreateTask}
                  className="border-t border-border/60 pt-5 2xl:hidden"
                />
              </div>
            </ScrollArea>
          </motion.div>
        ) : (
          <motion.div
            key="empty-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn("flex h-full items-center justify-center px-8 py-10", className)}
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
                Select a message from the inbox rail{canCompose ? " or start a new draft" : ""}. This center pane is where the thread stays in focus.
              </p>
              {canCompose && onCompose ? (
                <Button
                  size="sm"
                  onClick={onCompose}
                  className="mt-6 h-10 rounded-full px-4 shadow-none"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Compose email
                </Button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {email && desktopActionsSlot
        ? createPortal(
            <EmailActionControls
              onSummarize={() => void handleSummarize()}
              onImportanceIntent={handleImportanceIntent}
              onCreateTask={handleOpenCreateTask}
              orientation="column"
            />,
            desktopActionsSlot,
          )
        : null}
      <EmailImportanceFeedbackDialog
        email={email}
        open={importanceDialogOpen}
        signal={importanceSignal}
        existingFeedback={importanceFeedback}
        onOpenChange={(open) => {
          setImportanceDialogOpen(open);
          if (!open) {
            setImportanceSignal(null);
          }
        }}
        onRecorded={(emailId, feedback) => {
          setImportanceDialogOpen(false);
          setImportanceSignal(null);
          onImportanceRecorded?.(emailId, feedback);
        }}
      />
      <AttachmentPreviewModal
        attachment={previewAttachment}
        projectId={email?.project_id ?? 0}
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      />
      <Modal open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>Create task from email</ModalTitle>
            <ModalDescription>
              Capture a follow-up without leaving the thread.
            </ModalDescription>
          </ModalHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">Title</div>
              <Input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="What needs to happen?"
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <div className="text-xs font-medium text-muted-foreground">Description</div>
              <Textarea
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value)}
                rows={7}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <div className="text-xs font-medium text-muted-foreground">Priority</div>
                <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as typeof taskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <div className="text-xs font-medium text-muted-foreground">Status</div>
                <Select value={taskStatus} onValueChange={(value) => setTaskStatus(value as typeof taskStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <div className="text-xs font-medium text-muted-foreground">Due date</div>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) => setTaskDueDate(event.target.value)}
                />
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateTaskOpen(false)}
              disabled={isCreatingTask}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreateTask()} disabled={isCreatingTask}>
              {isCreatingTask ? "Creating..." : "Create task"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
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

              <div className="space-y-3 pb-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                        {getInitials(primaryContact.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  <div className="min-w-0">
                    <div className="text-xl font-semibold tracking-[-0.02em] break-all text-foreground [overflow-wrap:anywhere]">
                      {primaryContact.displayName}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{primaryContact.roleLabel}</div>
                    {primaryContact.linkLabel ? (
                      <div className="mt-2 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {primaryContact.linkLabel}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 py-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Details
              </div>
              {contextItems.map((item) => (
                <div key={item.label} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 text-sm">
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="break-all text-foreground [overflow-wrap:anywhere]">
                      {item.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 pb-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Actions
              </div>
              <div id="email-details-actions-slot" />
            </div>

            <div className="space-y-4 border-t border-border/70 pt-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
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
                  title: "Search",
                  body: "Keep the left rail quiet, then expand search only when you need to narrow a busy project thread.",
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
  canEdit,
  canCompose = true,
  canDelete = true,
  viewSwitcher,
  filterControl,
  sortBy,
  sortDirection,
  onSortChange,
  onCompose,
  onEdit,
  onDelete,
}: ProjectEmailsWorkspaceProps) {
  const [selectedEmailId, setSelectedEmailId] = React.useState<number | null>(null);
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = React.useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(
    () => searchValue.trim().length > 0,
  );

  React.useEffect(() => {
    if (searchValue.trim().length > 0) {
      setIsSearchExpanded(true);
    }
  }, [searchValue]);

  // Filtering (status, source, attachments, starred, date) is applied upstream
  // in EmailsClient via the shared filter state, so the rail renders the list
  // as-given.
  const visibleEmails = emails;

  React.useEffect(() => {
    if (visibleEmails.length === 0) {
      setSelectedEmailId(null);
      return;
    }

    setSelectedEmailId((current) => {
      if (current && visibleEmails.some((email) => email.id === current)) return current;
      return visibleEmails[0]?.id ?? null;
    });
  }, [visibleEmails]);

  const selectedEmail = React.useMemo(
    () => visibleEmails.find((email) => email.id === selectedEmailId) ?? null,
    [visibleEmails, selectedEmailId],
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

  const selectedEmailEditable = selectedEmail
    ? canEdit
      ? canEdit(selectedEmail)
      : true
    : false;

  const handleSelectEmail = React.useCallback((email: ProjectEmail) => {
    setSelectedEmailId(email.id);
    setIsDetailsPanelOpen(false);
  }, []);

  return (
    <div className="relative flex h-[calc(100dvh-8.5rem)] min-h-0 w-full flex-col overflow-hidden">
      <SplitPage
        breakpoint="xl"
        defaultIsOpen={!selectedEmail}
        className="min-h-0 flex-1"
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-b border-border/70 xl:w-96 xl:border-b-0 xl:border-r">
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[28px] font-semibold tracking-[-0.03em] text-foreground">
                  Emails
                </div>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                {filterControl}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchExpanded((current) => !current)}
                  aria-label="Search email"
                  className="h-8 w-8 rounded-full text-muted-foreground shadow-none"
                >
                  <Search className="h-4 w-4" />
                </Button>
                {onSortChange ? (
                  <SortPopover
                    sortBy={sortBy}
                    sortDirection={sortDirection}
                    onSortChange={onSortChange}
                  />
                ) : null}
                {viewSwitcher}
                {canCompose ? (
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
                ) : null}
              </div>
            </div>

            {tabs.length > 0 ? (
              <nav className="mt-3 flex items-center">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium transition-colors",
                      tab.isActive
                        ? "text-primary"
                        : "text-foreground/70 hover:text-foreground/90",
                    )}
                  >
                    {tab.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-colors",
                        tab.isActive ? "bg-primary" : "bg-transparent",
                      )}
                    />
                  </Link>
                ))}
              </nav>
            ) : null}

            <AnimatePresence initial={false}>
              {isSearchExpanded ? (
                <motion.div
                  key="expanded-search"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="relative mt-3">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={searchValue}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder="Search email"
                      className="h-10 rounded-full border-border bg-muted/40 pl-10 pr-10 shadow-none focus-visible:ring-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        onSearchChange("");
                        setIsSearchExpanded(false);
                      }}
                      aria-label="Close search"
                      className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground"
                    >
                      <Cross2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <ScrollArea className="min-h-0 min-w-0 flex-1 [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:!min-w-0 [&_[data-slot=scroll-area-viewport]>div]:!w-full">
            {isLoading ? (
              <div className="space-y-1 px-0 py-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-3 border-l-2 border-transparent px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
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
            ) : visibleEmails.length === 0 ? (
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
                {canCompose ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCompose}
                    className="mt-6 h-10 rounded-full px-4 shadow-none"
                  >
                    Start a draft
                  </Button>
                ) : null}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="min-w-0 divide-y divide-border/60 overflow-hidden"
              >
                {visibleEmails.map((email) => (
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

        <div className="flex h-full min-h-0 min-w-0">
          <div className="min-h-0 min-w-0 flex-1 border-b border-border/70 xl:border-b-0 2xl:border-r">
            <EmailReadingPanel
              email={selectedEmail}
              canCompose={canCompose}
              canEditEmail={selectedEmailEditable}
              canDelete={canDelete}
              onCompose={onCompose}
              onEdit={onEdit}
              onDelete={onDelete}
              showDetailsButton
              onOpenDetails={() => setIsDetailsPanelOpen(true)}
            />
          </div>

          <div className="hidden min-h-0 w-80 shrink-0 2xl:block">
            <EmailDetailsPanel
              selectedEmail={selectedEmail}
              primaryContact={primaryContact}
              contextItems={contextItems}
            />
          </div>
        </div>
      </SplitPage>

      <EmailDetailSheet
        email={selectedEmailDetail}
        open={isDetailsPanelOpen}
        onOpenChange={setIsDetailsPanelOpen}
        actions={
          selectedEmail ? (
            <div className="flex items-center gap-1">
              {selectedEmailEditable ? (
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
              ) : null}
              {canDelete ? (
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
              ) : null}
            </div>
          ) : null
        }
      />
    </div>
  );
}
