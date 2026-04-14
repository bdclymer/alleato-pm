import { Presence } from "@/components/issue-tracker/components/Presence";
import { Comments } from "@/components/issue-tracker/components/Comments";
import { Editor } from "@/components/issue-tracker/components/Editor";
import { IssueProperties } from "@/components/issue-tracker/components/IssueProperties";
import { IssueLabels } from "@/components/issue-tracker/components/IssueLabels";
import { IssueActions } from "@/components/issue-tracker/components/IssueActions";
import { liveblocks } from "@/components/issue-tracker/liveblocks.server.config";
import { withLexicalDocument } from "@liveblocks/node-lexical";
import { getRoomId } from "@/components/issue-tracker/config";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { IssueLinks } from "@/components/issue-tracker/components/IssueLinks";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { Status } from "./Status";

export async function Issue({ issueId }: { issueId: string }) {
  const roomId = getRoomId(issueId);

  const storagePromise = liveblocks.getStorageDocument(roomId, "json");

  const contentHtmlPromise = withLexicalDocument(
    {
      roomId,
      client: liveblocks,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    },
    async (doc) => {
      let markdown = "";

      doc.getEditorState().read(() => {
        markdown = $convertToMarkdownString(TRANSFORMERS, undefined, true)
          .replace(/\n{2,}/g, (match) => "<p><br></p>".repeat(match.length - 1))
          .replace(/\n(?!$)/g, "\n\n")
          .replace(/(\n+)$/g, (match) => "<p><br></p>".repeat(match.length));
      });

      markdown = sanitizeHtml(markdown, {
        allowedTags: ["p", "br"],
        disallowedTagsMode: "escape",
      });

      return marked(markdown);
    }
  );

   
  let storage: any;
  let contentHtml: string | undefined;

   
  const emptyStorage: any = {
    meta: { title: "" },
    properties: { progress: "none", priority: "none", assignedTo: "none" },
    labels: [],
    links: [],
  };

  try {
    [storage, contentHtml] = await Promise.all([
      storagePromise as Promise<unknown>,
      contentHtmlPromise,
    ]);
  } catch (err) {
    console.log("[Issue] server-side fetch failed, using empty storage:", err);
  }

  if (!storage || Object.keys(storage).length === 0) {
    storage = emptyStorage;
    contentHtml = "";
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex justify-between border-b border-border/60 h-10 px-4 items-center shrink-0">
        <Status />
        <Presence />
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[780px] mx-auto py-8 px-10">
            <Editor
              storageFallback={storage}
              contentFallback={
                <div dangerouslySetInnerHTML={{ __html: contentHtml ?? "" }} />
              }
            />
            <div className="mt-6">
              <IssueLinks storageFallback={storage} />
            </div>
            <div className="border-t border-border/50 mt-8 mb-6" />
            <Comments />
          </div>
        </div>

        {/* ── Linear-style right sidebar ──────────────────────── */}
        <aside className="border-l border-border/60 w-[240px] shrink-0 overflow-y-auto">
          {/* Properties section */}
          <div className="px-4 pt-4 pb-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Properties
            </p>
            <IssueProperties storageFallback={storage} />
          </div>

          <div className="border-t border-border/40 mx-4" />

          {/* Labels section */}
          <div className="px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Labels
            </p>
            <IssueLabels storageFallback={storage} />
          </div>

          <div className="border-t border-border/40 mx-4" />

          {/* Actions section */}
          <div className="px-4 py-3">
            <IssueActions issueId={issueId} />
          </div>
        </aside>
      </div>
    </div>
  );
}
