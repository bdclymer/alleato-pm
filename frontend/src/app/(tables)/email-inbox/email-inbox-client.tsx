"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type {
  BrandonAssistantAction,
  BrandonAssistantPriority,
} from "@/lib/email-assistant/brandon-triage";
import { EmailListPanel } from "./email-list-panel";
import { EmailReadingPane } from "./email-reading-pane";

export type InboxTab = "brandon-queue" | "needs-assignment" | "all" | "has-attachments";

export interface InboxAttachment {
  id: number;
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  graphAttachmentId: string;
  promotionStatus: string;
  attachmentType?: string | null;
}

export interface InboxEmail {
  id: number;
  graphMessageId: string;
  mailboxUserId: string;
  projectId: number | null;
  conversationId: string | null;
  subject: string;
  body: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  fromName: string | null;
  fromEmail: string | null;
  toList: string[] | null;
  ccList: string[] | null;
  matchStatus: string;
  assignmentConfidence: number | null;
  receivedAt: string | null;
  hasAttachments: boolean | null;
  webLink: string | null;
  starred: boolean;
  tags: string[];
  assistantAction: BrandonAssistantAction;
  assistantPriority: BrandonAssistantPriority;
  assistantScore: number;
  assistantReason: string;
  assistantOwner: string;
  assistantRisk: string;
  assistantEvidence: string;
  project: { id: number; name: string | null; projectNumber: string | null } | null;
  attachments: InboxAttachment[];
}

function assistantString(
  value: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  return typeof value[key] === "string" ? value[key] : fallback;
}

function parseEmails(raw: unknown[]): InboxEmail[] {
  return raw.map((r: unknown) => {
    const e = r as Record<string, unknown>;
    const meta = (e.source_metadata as Record<string, unknown>) ?? {};
    const inbox = (meta._inbox as Record<string, unknown>) ?? {};
    const assistant = (meta._assistant as Record<string, unknown>) ?? {};
    const proj = e.projects as {
      id: number;
      name: string | null;
      project_number: string | null;
    } | null;
    const rawAttachments = (
      e.outlook_email_intake_attachments as unknown[]
    ) ?? [];

    return {
      id: e.id as number,
      graphMessageId: e.graph_message_id as string,
      mailboxUserId: e.mailbox_user_id as string,
      projectId: (e.project_id as number | null) ?? null,
      conversationId: (e.conversation_id as string | null) ?? null,
      subject: (e.subject as string) || "(no subject)",
      body: (e.body as string | null) ?? null,
      bodyHtml: (e.body_html as string | null) ?? null,
      bodyText: (e.body_text as string | null) ?? null,
      fromName: (e.from_name as string | null) ?? null,
      fromEmail: (e.from_email as string | null) ?? null,
      toList: (e.to_list as string[] | null) ?? null,
      ccList: (e.cc_list as string[] | null) ?? null,
      matchStatus: (e.match_status as string) ?? "unassigned",
      assignmentConfidence: (e.assignment_confidence as number | null) ?? null,
      receivedAt: (e.received_at as string | null) ?? null,
      hasAttachments: (e.has_attachments as boolean | null) ?? null,
      webLink: (e.web_link as string | null) ?? null,
      starred: (inbox.starred as boolean) ?? false,
      tags: (inbox.tags as string[]) ?? [],
      assistantAction:
        assistantString(assistant, "action", "ignore") as BrandonAssistantAction,
      assistantPriority:
        assistantString(assistant, "priority", "low") as BrandonAssistantPriority,
      assistantScore:
        typeof assistant.score === "number" ? assistant.score : 0,
      assistantReason: assistantString(
        assistant,
        "reason",
        "No assistant decision available.",
      ),
      assistantOwner: assistantString(assistant, "owner", "No action"),
      assistantRisk: assistantString(assistant, "risk", "Low"),
      assistantEvidence: assistantString(
        assistant,
        "evidence",
        "Subject and sender metadata only.",
      ),
      project: proj
        ? {
            id: proj.id,
            name: proj.name,
            projectNumber: proj.project_number,
          }
        : null,
      attachments: rawAttachments.map((a: unknown) => {
        const att = a as Record<string, unknown>;
        const attMeta =
          (att.source_metadata as Record<string, unknown>) ?? {};
        const attInbox = (attMeta._inbox as Record<string, unknown>) ?? {};
        return {
          id: att.id as number,
          fileName: att.file_name as string,
          fileSize: (att.file_size as number | null) ?? null,
          contentType: (att.content_type as string | null) ?? null,
          graphAttachmentId: att.graph_attachment_id as string,
          promotionStatus: (att.promotion_status as string) ?? "pending",
          attachmentType: (attInbox.type as string | null) ?? null,
        };
      }),
    };
  });
}

export function EmailInboxClient() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<InboxTab>("brandon-queue");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [draftReplyOpen, setDraftReplyOpen] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = ["email-inbox", activeTab, debouncedSearch];

  const { data: rawEmails = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ tab: activeTab });
      if (debouncedSearch) params.set("q", debouncedSearch);
      const data = await apiFetch<unknown[]>(`/api/email-inbox?${params}`);
      return data;
    },
  });

  const emails = React.useMemo(() => parseEmails(rawEmails), [rawEmails]);

  // Counts for tab badges
  const { data: needsCount = 0 } = useQuery({
    queryKey: ["email-inbox-count", "needs-assignment"],
    queryFn: async () => {
      const data = await apiFetch<unknown[]>("/api/email-inbox?tab=needs-assignment");
      return data.length;
    },
    refetchInterval: 60_000,
  });

  const { data: brandonQueueCount = 0 } = useQuery({
    queryKey: ["email-inbox-count", "brandon-queue"],
    queryFn: async () => {
      const data = await apiFetch<unknown[]>("/api/email-inbox?tab=brandon-queue");
      return data.length;
    },
    refetchInterval: 60_000,
  });

  const selectedEmail = emails.find((e) => e.id === selectedId) ?? null;

  // Auto-select first email when list loads or tab changes
  React.useEffect(() => {
    if (emails.length > 0 && !selectedId) {
      setSelectedId(emails[0].id);
    } else if (emails.length > 0 && !emails.find((e) => e.id === selectedId)) {
      setSelectedId(emails[0].id);
    }
  }, [emails, selectedId]);

  // Close draft reply when switching emails
  React.useEffect(() => {
    setDraftReplyOpen(false);
  }, [selectedId]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const idx = emails.findIndex((em) => em.id === selectedId);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (idx < emails.length - 1) setSelectedId(emails[idx + 1].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (idx > 0) setSelectedId(emails[idx - 1].id);
      } else if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        if (selectedEmail) setDraftReplyOpen(true);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [emails, selectedId, selectedEmail]);

  const assignMutation = useMutation({
    mutationFn: ({
      emailId,
      projectId,
    }: {
      emailId: number;
      projectId: number | null;
    }) =>
      apiFetch(`/api/email-inbox/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      }),
    onSuccess: (_, { projectId }) => {
      toast.success(projectId ? "Assigned to project" : "Assignment cleared");
      void queryClient.invalidateQueries({ queryKey: ["email-inbox"] });
    },
    onError: () => toast.error("Failed to update assignment"),
  });

  const tagMutation = useMutation({
    mutationFn: ({ emailId, tags }: { emailId: number; tags: string[] }) =>
      apiFetch(`/api/email-inbox/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Failed to update tags"),
  });

  const starMutation = useMutation({
    mutationFn: ({
      emailId,
      starred,
    }: {
      emailId: number;
      starred: boolean;
    }) =>
      apiFetch(`/api/email-inbox/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starred }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error("Failed to update"),
  });

  function handleTabChange(tab: InboxTab) {
    setActiveTab(tab);
    setSelectedId(null);
    setSearch("");
    setDraftReplyOpen(false);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* Left panel — fixed width */}
      <div className="w-96 shrink-0 border-r border-border/50 flex flex-col overflow-hidden">
        <EmailListPanel
          emails={emails}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          selectedId={selectedId}
          onSelect={setSelectedId}
          search={search}
          onSearchChange={setSearch}
          needsAssignmentCount={needsCount}
          brandonQueueCount={brandonQueueCount}
        />
      </div>

      {/* Right panel — flexible */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <EmailReadingPane
          email={selectedEmail}
          draftReplyOpen={draftReplyOpen}
          onDraftReplyOpen={() => setDraftReplyOpen(true)}
          onDraftReplyClose={() => setDraftReplyOpen(false)}
          onAssignProject={(projectId) => {
            if (selectedEmail) {
              assignMutation.mutate({
                emailId: selectedEmail.id,
                projectId,
              });
            }
          }}
          onToggleStar={() => {
            if (selectedEmail) {
              starMutation.mutate({
                emailId: selectedEmail.id,
                starred: !selectedEmail.starred,
              });
            }
          }}
          onTagsChange={(tags) => {
            if (selectedEmail) {
              tagMutation.mutate({ emailId: selectedEmail.id, tags });
            }
          }}
        />
      </div>
    </div>
  );
}
