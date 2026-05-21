"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Link2, Loader2, Play, Wrench } from "lucide-react";
import { Button, EmptyState } from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import { reportNonCriticalFailure } from "@/lib/report-non-critical-failure";
import { appToast as toast } from "@/lib/toast/app-toast";
import { cn } from "@/lib/utils";

import type { FeedbackItem, ToolContextData, ToolOption } from "../types";
import { notifyFeedbackInboxFailure } from "../helpers";

export function ToolContextSection({ item }: { item: FeedbackItem }) {
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [assignedToolId, setAssignedToolId] = useState<number | null>(null);
  const [context, setContext] = useState<ToolContextData | null>(null);
  const [loading, setLoading] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      try {
        const [toolsResult, matchResult] = await Promise.allSettled([
          apiFetch<{ tools?: ToolOption[] }>(
            "/api/admin/feedback/tools?action=list",
          ),
          apiFetch<{
            match?: { id: number };
            context?: ToolContextData | null;
          }>(`/api/admin/feedback/tools?action=match&feedbackId=${item.id}`),
        ]);

        if (cancelled) return;

        if (toolsResult.status === "fulfilled") {
          setTools(toolsResult.value.tools ?? []);
        } else {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "load-feedback-tools",
            error: toolsResult.reason,
            userVisibleFallback: "Tool assignment options could not be loaded.",
            metadata: { feedbackId: item.id },
          });
        }

        if (matchResult.status === "fulfilled") {
          const data = matchResult.value;
          if (data.match) {
            setAssignedToolId(data.match.id);
            setContext(data.context ?? null);
          }
        } else {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "match-feedback-tool",
            error: matchResult.reason,
            userVisibleFallback: "Feedback tool auto-match could not be loaded.",
            metadata: { feedbackId: item.id },
          });
        }
      } catch (error) {
        reportNonCriticalFailure({
          area: "feedback-inbox",
          operation: "initialize-tool-context",
          error,
          userVisibleFallback: "Tool context could not be initialized.",
          metadata: { feedbackId: item.id },
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  async function handleAssign(toolId: number) {
    setShowDropdown(false);
    setLoading(true);
    try {
      await apiFetch("/api/admin/feedback/tools", {
        method: "POST",
        body: JSON.stringify({ feedbackId: item.id, toolId }),
      });
      setAssignedToolId(toolId);
      try {
        const data = await apiFetch<{ context?: ToolContextData | null }>(
          `/api/admin/feedback/tools?action=resolve&toolId=${toolId}`,
        );
        setContext(data.context ?? null);
      } catch (err) {
        reportNonCriticalFailure({
          area: "feedback-inbox",
          operation: "load-assigned-tool-context",
          error: err,
          userVisibleFallback: "Tool assignment saved, but context could not be loaded.",
          metadata: { feedbackId: item.id, toolId },
        });
      }
      toast.success("Tool assigned");
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "assign-tool",
        title: "Could not assign tool",
        fallback: "The feedback tool assignment could not be saved.",
        error: err,
        metadata: { feedbackId: item.id, toolId },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoMatch() {
    setLoading(true);
    try {
      const data = await apiFetch<{ item?: { tool_id?: number | null } }>(
        "/api/admin/feedback/tools",
        {
          method: "POST",
          body: JSON.stringify({ feedbackId: item.id, toolId: null, auto: true }),
        },
      );
      const newToolId = data.item?.tool_id;
      setAssignedToolId(newToolId ?? null);
      if (newToolId) {
        try {
          const ctxData = await apiFetch<{ context?: ToolContextData | null }>(
            `/api/admin/feedback/tools?action=resolve&toolId=${newToolId}`,
          );
          setContext(ctxData.context ?? null);
        } catch (err) {
          reportNonCriticalFailure({
            area: "feedback-inbox",
            operation: "load-auto-matched-tool-context",
            error: err,
            userVisibleFallback: "Tool auto-match saved, but context could not be loaded.",
            metadata: { feedbackId: item.id, toolId: newToolId },
          });
        }
        toast.success("Tool auto-matched");
      } else {
        setContext(null);
        toast("No matching tool found", { description: "Assign one manually." });
      }
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "auto-match-tool",
        title: "Could not auto-match tool",
        fallback: "The feedback tool could not be auto-matched.",
        error: err,
        metadata: { feedbackId: item.id },
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCrawl() {
    if (!context) return;
    const slug = tools.find((t) => t.id === assignedToolId)?.slug;
    if (!slug) return;

    setCrawling(true);
    try {
      await apiFetch("/api/admin/feedback/crawl", {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
      toast.success("Procore crawl complete", {
        description: `Manifest saved for ${slug}`,
      });
    } catch (err) {
      notifyFeedbackInboxFailure({
        operation: "crawl-tool-context",
        title: "Could not crawl Procore context",
        fallback: "The Procore context crawl failed.",
        error: err,
        metadata: {
          feedbackId: item.id,
          toolSlug: slug,
        },
      });
    } finally {
      setCrawling(false);
    }
  }

  const assignedTool = tools.find((t) => t.id === assignedToolId);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative" ref={dropdownRef}>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground transition-colors"
          >
            <Wrench className="h-3 w-3 text-muted-foreground" />
            {assignedTool ? assignedTool.name : "Assign tool"}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>

          {showDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-sm">
              {tools.map((tool) => (
                <Button
                  key={tool.id}
                  type="button"
                  variant="ghost"
                  size="default"
                  onClick={() => handleAssign(tool.id)}
                  className={cn(
                    "h-auto w-full justify-start gap-2 rounded-sm px-2 py-1.5 text-left text-xs font-normal transition-colors hover:bg-muted",
                    tool.id === assignedToolId && "bg-primary/10 text-primary",
                  )}
                >
                  <span className="truncate">{tool.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {tool.category}
                  </span>
                </Button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleAutoMatch}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
          title="Auto-detect tool from feedback content"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Auto-match
        </Button>
      </div>

      {context && (
        <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Tool</span>
            <span className="font-medium text-foreground">{context.tool_name}</span>
          </div>
          {context.procore_url && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-20 shrink-0">Procore</span>
              <a
                href={context.procore_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Link2 className="h-3 w-3 shrink-0" />
                {context.procore_url.replace(/https?:\/\/[^/]+/, "")}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">PRP</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.prp_path}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Research</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.research_folder}
            </code>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground w-20 shrink-0">Manifest</span>
            <code className="truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
              {context.manifest_path}
            </code>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={handleCrawl}
              disabled={crawling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {crawling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {crawling ? "Crawling Procore..." : "Crawl Procore"}
            </Button>
          </div>
        </div>
      )}

      {!context && !loading && (
        <EmptyState
          icon={<Wrench />}
          title="No tool matched"
          description="Assign one manually or click Auto-match."
        />
      )}
    </div>
  );
}
