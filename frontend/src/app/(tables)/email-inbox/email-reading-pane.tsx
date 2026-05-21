"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Bot,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-client";
import { useProjects } from "@/hooks/use-projects";
import type { InboxEmail } from "./email-inbox-client";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

const ATTACHMENT_TYPES = [
  "Contract",
  "Revised Drawings",
  "Change Order",
  "COI",
  "Invoice",
  "RFI",
  "Submittal",
  "Meeting Minutes",
  "Lien Waiver",
  "Permit",
  "Photo / Site Documentation",
  "Report",
  "Specifications",
  "Correspondence",
  "Other",
] as const;

const EMAIL_TAGS = [
  "Urgent",
  "Action Required",
  "FYI",
  "Finance",
  "Legal",
  "Safety",
  "Waiting on Response",
  "Review Needed",
] as const;

function fileSizeLabel(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(contentType: string | null) {
  if (!contentType) return <Paperclip className="size-3.5" />;
  if (contentType.includes("pdf") || contentType.includes("word"))
    return <FileText className="size-3.5" />;
  return <Paperclip className="size-3.5" />;
}

function AssignProjectPopover({
  email,
  onAssign,
}: {
  email: InboxEmail;
  onAssign: (projectId: number | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const { projects, isLoading } = useProjects({ enabled: open });

  async function handleSelect(projectId: number | null) {
    setSaving(true);
    try {
      onAssign(projectId);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const projectLabel = email.project
    ? email.project.projectNumber
      ? `${email.project.projectNumber} — ${email.project.name ?? ""}`
      : (email.project.name ?? `Project ${email.project.id}`)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={saving}>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Check className="size-3.5" />
          )}
          {projectLabel ?? "Assign to Project"}
          <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading…" : "No projects found."}
            </CommandEmpty>
            <CommandGroup>
              {email.project && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => handleSelect(null)}
                  className="text-muted-foreground"
                >
                  <X className="size-3.5 mr-2" />
                  Clear assignment
                </CommandItem>
              )}
              {projects?.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.project_number ?? ""} ${p.name ?? ""}`}
                  onSelect={() => handleSelect(p.id)}
                >
                  {p.project_number && (
                    <span className="text-muted-foreground mr-1.5 text-xs">
                      {p.project_number}
                    </span>
                  )}
                  {p.name ?? `Project ${p.id}`}
                  {email.project?.id === p.id && (
                    <Check className="size-3.5 ml-auto text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TagsEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);

  function toggle(tag: string) {
    const next = tags.includes(tag)
      ? tags.filter((t) => t !== tag)
      : [...tags, tag];
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground">
          <Tag className="size-3.5" />
          Tag
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5" align="start">
        <div className="flex flex-col gap-0.5">
          {EMAIL_TAGS.map((tag) => (
            <Button
              key={tag}
              variant="ghost"
              size="sm"
              onClick={() => toggle(tag)}
              className={cn(
                "flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors h-auto w-full justify-start",
                tags.includes(tag)
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              {tag}
              {tags.includes(tag) && <Check className="size-3 text-primary ml-auto" />}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AttachmentChip({
  attachment,
  emailId,
}: {
  attachment: InboxEmail["attachments"][number];
  emailId: number;
}) {
  const [type, setType] = React.useState<string | null>(
    attachment.attachmentType ?? null,
  );
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  async function handleTypeSelect(selected: string) {
    setSaving(true);
    try {
      await apiFetch(`/api/email-inbox/attachments/${attachment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentType: selected }),
      });
      setType(selected);
    } catch {
      toast.error("Failed to set attachment type");
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  function handleDownload() {
    window.open(
      `/api/outlook-intake/attachments/${attachment.id}/download`,
      "_blank",
    );
  }

  return (
    <div className="group rounded-lg bg-muted/60 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{fileIcon(attachment.contentType)}</span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-foreground truncate max-w-36">
          {attachment.fileName}
        </span>
        {attachment.fileSize && (
          <span className="text-[10px] text-muted-foreground leading-none">
            {fileSizeLabel(attachment.fileSize)}
          </span>
        )}
      </div>

      {/* Type selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 px-2 text-[10px] gap-1 rounded-md border",
              type
                ? "border-primary/30 text-primary bg-primary/5"
                : "border-border/50 text-muted-foreground",
            )}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <>
                {type ?? "Type"}
                <ChevronDown className="size-2.5" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start">
          <div className="flex flex-col gap-0.5">
            {ATTACHMENT_TYPES.map((t) => (
              <Button
                key={t}
                variant="ghost"
                size="sm"
                onClick={() => handleTypeSelect(t)}
                className={cn(
                  "h-auto w-full justify-start px-2.5 py-1.5 text-xs",
                  type === t ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {t}
                {type === t && <Check className="size-3 text-primary ml-auto" />}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDownload}
        aria-label="Download"
      >
        <Download className="size-3.5" />
      </Button>
      </div>
    </div>
  );
}

function DraftReplyPanel({
  email,
  onClose,
}: {
  email: InboxEmail;
  onClose: () => void;
}) {
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [tone, setTone] = React.useState<"professional" | "concise" | "detailed">(
    "professional",
  );

  async function fetchDraft(selectedTone = tone) {
    setLoading(true);
    try {
      const result = await apiFetch<{ draft: string }>(
        `/api/email-inbox/${email.id}/draft-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: email.subject,
            fromName: email.fromName,
            fromEmail: email.fromEmail,
            bodyText: email.bodyText ?? email.body,
            projectName: email.project?.name ?? null,
            tone: selectedTone,
          }),
        },
      );
      setDraft(result.draft);
    } catch {
      toast.error("Failed to generate draft — check AI configuration.");
      setDraft("");
    } finally {
      setLoading(false);
    }
  }

  // Fetch initial draft on mount only; tone changes are triggered explicitly
  const hasFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      void fetchDraft();
    }
  });

  function handleSend() {
    if (email.webLink) {
      window.open(email.webLink, "_blank");
    }
    toast.success("Reply draft copied — paste into Outlook to send.");
    navigator.clipboard.writeText(draft).catch(() => {});
    onClose();
  }

  return (
    <div className="border-t border-border/50 bg-card flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-primary" />
          <span className="text-sm font-medium">AI Draft Reply</span>
          <div className="flex items-center gap-1 ml-2">
            {(["professional", "concise", "detailed"] as const).map((t) => (
              <Button
                key={t}
                variant={tone === t ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setTone(t);
                  void fetchDraft(t);
                }}
                className="h-6 px-2 text-xs capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-7 text-muted-foreground"
            onClick={() => void fetchDraft()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Regenerate
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 p-3">
        {loading ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Drafting reply…
          </div>
        ) : (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-32 text-sm resize-none border-border/40 bg-background focus-visible:ring-primary/20"
            placeholder="Draft will appear here…"
          />
        )}
      </div>

      <div className="flex items-center justify-between px-3 pb-3">
        <p className="text-[11px] text-muted-foreground">
          Review before sending. Opens Outlook when ready.
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onClose}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSend}
            disabled={loading || !draft}
          >
            <Send className="size-3.5" />
            Copy &amp; Open in Outlook
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EmailReadingPaneProps {
  email: InboxEmail | null;
  draftReplyOpen: boolean;
  onDraftReplyOpen: () => void;
  onDraftReplyClose: () => void;
  onAssignProject: (projectId: number | null) => void;
  onToggleStar: () => void;
  onTagsChange: (tags: string[]) => void;
}

export function EmailReadingPane({
  email,
  draftReplyOpen,
  onDraftReplyOpen,
  onDraftReplyClose,
  onAssignProject,
  onToggleStar,
  onTagsChange,
}: EmailReadingPaneProps) {
  const [summaryOpen, setSummaryOpen] = React.useState(false);
  const [summary, setSummary] = React.useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(false);

  React.useEffect(() => {
    setSummaryOpen(false);
    setSummary(null);
  }, [email?.id]);

  async function handleSummarize() {
    if (!email) return;
    setSummaryOpen(true);
    if (summary) return;
    setSummaryLoading(true);
    try {
      const result = await apiFetch<{ draft: string }>(
        `/api/email-inbox/${email.id}/draft-reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: email.subject,
            fromName: email.fromName,
            fromEmail: email.fromEmail,
            bodyText: `Summarize this email in 1-2 sentences: ${email.bodyText ?? email.body ?? ""}`,
            tone: "concise",
          }),
        },
      );
      setSummary(result.draft);
    } catch {
      setSummary("Could not generate summary.");
    } finally {
      setSummaryLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground/50">
        <Mail className="size-10" />
        <p className="text-sm">Select an email to read</p>
        <p className="text-xs text-muted-foreground/40">
          Use <kbd className="font-mono text-[10px]">j</kbd> /{" "}
          <kbd className="font-mono text-[10px]">k</kbd> to navigate
        </p>
      </div>
    );
  }

  const dateStr = email.receivedAt
    ? format(new Date(email.receivedAt), "MMM d, yyyy 'at' h:mm a")
    : null;
  const toStr = (email.toList ?? []).join(", ");
  const ccStr = (email.ccList ?? []).join(", ");

  return (
    <div className="flex flex-col h-full">
      {/* Email header */}
      <div className="px-6 py-4 border-b border-border/40 shrink-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          <p className="text-base font-semibold text-foreground leading-snug flex-1">
            {email.subject}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onToggleStar}
              aria-label={email.starred ? "Unstar" : "Star"}
            >
              <Star
                className={cn(
                  "size-4",
                  email.starred
                    ? "fill-warning text-warning"
                    : "text-muted-foreground",
                )}
              />
            </Button>
            {email.webLink && (
              <Button variant="ghost" size="icon" className="size-8" asChild>
                <a
                  href={email.webLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open in Outlook"
                >
                  <ExternalLink className="size-4 text-muted-foreground" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <dl className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-medium text-foreground/60 w-8 shrink-0">From</dt>
            <dd>
              {email.fromName ? (
                <>
                  <span className="text-foreground">{email.fromName}</span>{" "}
                  {email.fromEmail && (
                    <span className="text-muted-foreground">
                      &lt;{email.fromEmail}&gt;
                    </span>
                  )}
                </>
              ) : (
                email.fromEmail ?? "Unknown"
              )}
            </dd>
          </div>
          {toStr && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground/60 w-8 shrink-0">To</dt>
              <dd className="truncate">{toStr}</dd>
            </div>
          )}
          {ccStr && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground/60 w-8 shrink-0">Cc</dt>
              <dd className="truncate">{ccStr}</dd>
            </div>
          )}
          {dateStr && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground/60 w-8 shrink-0">Date</dt>
              <dd>{dateStr}</dd>
            </div>
          )}
          {email.project && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground/60 w-8 shrink-0">Proj</dt>
              <dd className="text-primary">
                {email.project.projectNumber
                  ? `${email.project.projectNumber} — ${email.project.name ?? ""}`
                  : (email.project.name ?? `Project ${email.project.id}`)}
              </dd>
            </div>
          )}
        </dl>

        {/* Tags */}
        {email.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {email.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-info-subtle text-info font-medium"
              >
                {tag}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onTagsChange(email.tags.filter((t) => t !== tag))
                  }
                  className="size-3.5 hover:opacity-70 ml-0.5 p-0 h-auto"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="size-2.5" />
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* AI Summary banner */}
      {summaryOpen && (
        <div className="px-6 py-3 border-b border-border/30 bg-muted/30 shrink-0">
          <div className="flex items-start gap-2">
            <Sparkles className="size-3.5 text-primary mt-0.5 shrink-0" />
            {summaryLoading ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="size-3 animate-spin" /> Summarizing…
              </span>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                {summary}
              </p>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSummaryOpen(false)}
              className="size-6 text-muted-foreground shrink-0"
              aria-label="Close summary"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Email body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
        {email.bodyHtml ? (
          <div
            className="prose prose-sm max-w-none text-foreground [&_a]:text-primary"
            // We render sanitized HTML; the API strips unsafe tags via the DB text pipeline
            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
          />
        ) : email.bodyText ? (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {decodeHtmlEntities(email.bodyText)}
          </pre>
        ) : email.body ? (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {decodeHtmlEntities(email.body)}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">(No body content)</p>
        )}
      </div>

      {/* Attachments strip */}
      {email.attachments.length > 0 && (
        <div className="px-6 py-3 border-t border-border/30 shrink-0">
          <div className="flex items-center gap-1.5 mb-2">
            <Paperclip className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {email.attachments.length}{" "}
              {email.attachments.length === 1 ? "Attachment" : "Attachments"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {email.attachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachment={att}
                emailId={email.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-border/40 shrink-0 flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          className="gap-1.5 text-xs h-8"
          onClick={onDraftReplyOpen}
          disabled={draftReplyOpen}
        >
          <Bot className="size-3.5" />
          Draft Reply
        </Button>

        <AssignProjectPopover email={email} onAssign={onAssignProject} />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
          onClick={handleSummarize}
        >
          <Sparkles className="size-3.5" />
          Summarize
        </Button>

        <TagsEditor tags={email.tags} onChange={onTagsChange} />

        {email.webLink && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground ml-auto"
            asChild
          >
            <a href={email.webLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5" />
              Open in Outlook
            </a>
          </Button>
        )}
      </div>

      {/* Draft reply compose area */}
      {draftReplyOpen && (
        <DraftReplyPanel email={email} onClose={onDraftReplyClose} />
      )}
    </div>
  );
}
