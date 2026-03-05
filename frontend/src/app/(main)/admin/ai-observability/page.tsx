"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Cpu,
  Coins,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  estimatedCost: number;
  feedbackUp: number;
  feedbackDown: number;
  avgTokensPerMessage: number;
  recentConversations: Array<{
    session_id: string;
    title: string;
    messageCount: number;
    totalTokens: number;
    lastMessageAt: string;
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Cloud LangFuse dashboard URL — set via NEXT_PUBLIC_LANGFUSE_BASE_URL in .env
const LANGFUSE_URL =
  process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL ?? "https://us.cloud.langfuse.com";

// Cost per 1M tokens (Claude Sonnet 4.5 via AI Gateway)
const COST_PER_1M_INPUT = 3.0;
const COST_PER_1M_OUTPUT = 15.0;

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AIObservabilityPage() {
  return (
    <>
      <ProjectPageHeader
        title="AI Observability"
        description="Monitor AI assistant performance, token usage, costs, and user feedback"
        actions={
          <Button size="sm" asChild>
            <a href={LANGFUSE_URL} target="_blank" rel="noopener noreferrer">
              <Activity className="h-3.5 w-3.5 mr-1.5" />
              Open LangFuse Dashboard
              <ExternalLink className="h-3 w-3 ml-1.5" />
            </a>
          </Button>
        }
      />
      <PageContainer>
        <div className="space-y-8 max-w-4xl">
          <QuickLinks />
          <Separator />
          <UsageOverview />
        </div>
      </PageContainer>
    </>
  );
}

// ---------------------------------------------------------------------------
// Quick Links
// ---------------------------------------------------------------------------

function QuickLinks() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Quick Links</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <QuickLinkCard
          title="LangFuse Traces"
          description="View all AI traces, latency, and tool call chains"
          href={`${LANGFUSE_URL}/traces`}
          icon={<Activity className="h-4 w-4" />}
        />
        <QuickLinkCard
          title="LangFuse Dashboard"
          description="Token usage charts, cost trends, and model analytics"
          href={`${LANGFUSE_URL}/dashboard`}
          icon={<Cpu className="h-4 w-4" />}
        />
        <QuickLinkCard
          title="LangFuse Sessions"
          description="Browse conversations and replay agent reasoning"
          href={`${LANGFUSE_URL}/sessions`}
          icon={<MessageSquare className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function QuickLinkCard({
  title,
  description,
  href,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-md bg-muted/40 p-4 hover:bg-muted/60 transition-colors"
    >
      <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// Usage Overview (from chat_history metadata)
// ---------------------------------------------------------------------------

function UsageOverview() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai-assistant/usage-stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Unable to load usage stats. Make sure the API is running.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Usage Overview</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchStats}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Conversations"
          value={stats.totalConversations.toLocaleString()}
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          label="Total Tokens"
          value={formatTokens(stats.totalTokens)}
          icon={<Cpu className="h-4 w-4" />}
        />
        <StatCard
          label="Est. Cost"
          value={`$${stats.estimatedCost.toFixed(2)}`}
          icon={<Coins className="h-4 w-4" />}
        />
        <StatCard
          label="Feedback"
          value={
            <span className="flex items-center gap-2">
              <span className="flex items-center gap-0.5 text-green-600">
                <ThumbsUp className="h-3 w-3" />
                {stats.feedbackUp}
              </span>
              <span className="flex items-center gap-0.5 text-red-500">
                <ThumbsDown className="h-3 w-3" />
                {stats.feedbackDown}
              </span>
            </span>
          }
          icon={<ThumbsUp className="h-4 w-4" />}
        />
      </div>

      {/* Recent Conversations */}
      {stats.recentConversations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recent Conversations
          </h4>
          <div className="space-y-1.5">
            {stats.recentConversations.map((conv) => (
              <div
                key={conv.session_id}
                className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">
                    {conv.title || "Untitled conversation"}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  <span>{conv.messageCount} msgs</span>
                  {conv.totalTokens > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatTokens(conv.totalTokens)} tokens
                    </Badge>
                  )}
                  <span>
                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-md bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}
