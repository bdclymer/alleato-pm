"use client";

import { useStream } from "@langchain/langgraph-sdk/react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-client";
import { InfoAlert } from "@/components/ds/InfoAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id?: string;
  type?: string;
  role?: string;
  content?: unknown;
};

const LANGGRAPH_API_ENV = process.env.NEXT_PUBLIC_LANGGRAPH_API_URL;
const API_URL = LANGGRAPH_API_ENV ?? "http://127.0.0.1:2024";
const USES_RENDER_BACKEND = !LANGGRAPH_API_ENV;
const ASSISTANT_ID = "advisor";

type BackendMessage = Message & {
  toolTrace?: Array<{
    tool: string;
    status: string;
    detail?: string | null;
  }>;
  metadata?: {
    mode?: string;
    confidence?: string;
    evidenceCount?: number;
    sourceCount?: number;
  };
};

function renderContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  if (content && typeof content === "object") {
    return JSON.stringify(content, null, 2);
  }
  return "";
}

function roleOf(msg: Message): string {
  return msg.type ?? msg.role ?? "assistant";
}

function violatesPmDataContract(content: unknown): boolean {
  const text = renderContent(content).toLowerCase();
  return (
    text.includes("files mounted") ||
    text.includes("local file") ||
    text.includes("this workspace") ||
    text.includes("workspace files")
  );
}

export function AdvisorChat({ projectId }: { projectId?: number }) {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [backendMessages, setBackendMessages] = useState<BackendMessage[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  // Resolve Supabase user ID once on mount — passed to alleato-ai as configurable
  // so the memory middleware can load per-user durable memories.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
  }, []);

  const stream = useStream<{ messages: Message[] }>({
    assistantId: ASSISTANT_ID,
    apiUrl: API_URL,
    messagesKey: "messages",
    threadId: threadId ?? undefined,
    onThreadId: setThreadId,
  });

  const messages: BackendMessage[] = USES_RENDER_BACKEND
    ? backendMessages
    : (stream.messages ?? []);
  const latestAssistantContractFailure = [...messages]
    .reverse()
    .find((msg) => {
      const role = roleOf(msg);
      return (
        role !== "human" &&
        role !== "user" &&
        violatesPmDataContract(msg.content)
      );
    });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || stream.isLoading || backendLoading) return;
    setInput("");
    if (USES_RENDER_BACKEND) {
      const humanMessage: BackendMessage = {
        id: `human-${Date.now()}`,
        type: "human",
        content: text,
      };
      setBackendMessages((current) => [...current, humanMessage]);
      setBackendLoading(true);
      setBackendError(null);
      apiFetch<Record<string, unknown>>("/api/ai-assistant-v2/deep-agent", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: text,
          ...(projectId ? { projectId } : {}),
          sessionId: threadId ?? undefined,
        }),
      })
        .then((payload) => {
          const toolTrace = Array.isArray(payload.toolTrace)
            ? payload.toolTrace
            : [];
          const assistantMessage: BackendMessage = {
            id: `assistant-${Date.now()}`,
            type: "assistant",
            content:
              typeof payload.answer === "string"
                ? payload.answer
                : "Deep Agents returned no answer text.",
            toolTrace,
            metadata: {
              mode: typeof payload.mode === "string" ? payload.mode : undefined,
              confidence:
                typeof payload.confidence === "string"
                  ? payload.confidence
                  : undefined,
              evidenceCount: Array.isArray(payload.evidence)
                ? payload.evidence.length
                : 0,
              sourceCount: Array.isArray(payload.sourcesChecked)
                ? payload.sourcesChecked.length
                : 0,
            },
          };
          setBackendMessages((current) => [...current, assistantMessage]);
        })
        .catch((error) => {
          setBackendError(error instanceof Error ? error.message : String(error));
        })
        .finally(() => setBackendLoading(false));
      return;
    }
    stream.submit(
      { messages: [...messages, { type: "human", content: text }] },
      {
        config: {
          configurable: {
            ...(userId ? { user_id: userId } : {}),
            ...(projectId ? { project_id: projectId } : {}),
          },
        },
      },
    );
  };

  const onReset = () => {
    stream.stop();
    setThreadId(null);
    setBackendMessages([]);
    setBackendError(null);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">AI Assistant v2</h1>
          <p className="text-xs text-muted-foreground">
            {USES_RENDER_BACKEND ? (
              <>Render Deep Agents backend</>
            ) : (
              <>
                LangGraph · assistant <code>{ASSISTANT_ID}</code> · {API_URL}
              </>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs"
        >
          New thread
        </Button>
      </header>

      {USES_RENDER_BACKEND ? (
        <InfoAlert variant="success" role="status">
          V2 is connected to the Render Deep Agents backend.
        </InfoAlert>
      ) : null}

      {latestAssistantContractFailure ? (
        <InfoAlert variant="error" role="alert">
          This v2 response failed the PM data contract because it answered from a
          generic workspace/files assumption instead of using Alleato database or
          source tools. Treat this thread as invalid and use{" "}
          <Link href="/ai-assistant" className="font-medium underline">
            AI Assistant
          </Link>{" "}
          while the LangGraph service is corrected.
        </InfoAlert>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto pr-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ask the advisor a question to compare it against v1.
          </p>
        )}
        {messages.map((msg, i) => {
          const role = roleOf(msg);
          const isUser = role === "human" || role === "user";
          return (
            <div
              key={msg.id ?? i}
              className={`rounded-lg border p-3 text-sm ${
                isUser ? "bg-muted/40" : "bg-background"
              }`}
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {role}
              </div>
              <div className="whitespace-pre-wrap break-words">
                {renderContent(msg.content)}
              </div>
              {!isUser && msg.metadata ? (
                <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  {msg.metadata.mode ?? "unknown mode"} · confidence{" "}
                  {msg.metadata.confidence ?? "unknown"} ·{" "}
                  {msg.metadata.sourceCount ?? 0} source categories ·{" "}
                  {msg.toolTrace?.length ?? 0} tool calls
                </div>
              ) : null}
            </div>
          );
        })}
        {(stream.isLoading || backendLoading) && (
          <div className="text-xs text-muted-foreground">Thinking…</div>
        )}
        {(stream.error != null || backendError) && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {backendError ??
              String(
                (stream.error as { message?: string })?.message ?? stream.error,
              )}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t pt-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the advisor..."
          disabled={backendLoading}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={stream.isLoading || backendLoading || !input.trim()}
        >
          Send
        </Button>
        {stream.isLoading && !USES_RENDER_BACKEND && (
          <Button
            type="button"
            variant="outline"
            onClick={() => stream.stop()}
          >
            Stop
          </Button>
        )}
      </form>
    </div>
  );
}
