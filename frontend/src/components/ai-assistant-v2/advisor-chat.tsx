"use client";

import { useStream } from "@langchain/langgraph-sdk/react";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id?: string;
  type?: string;
  role?: string;
  content?: unknown;
};

const API_URL =
  process.env.NEXT_PUBLIC_LANGGRAPH_API_URL ?? "http://127.0.0.1:2024";
const ASSISTANT_ID = "advisor";

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

export function AdvisorChat({ projectId }: { projectId?: number }) {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  const messages: Message[] = stream.messages ?? [];

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || stream.isLoading) return;
    setInput("");
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
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-semibold">AI Assistant v2</h1>
          <p className="text-xs text-muted-foreground">
            LangGraph · assistant <code>{ASSISTANT_ID}</code> · {API_URL}
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
            </div>
          );
        })}
        {stream.isLoading && (
          <div className="text-xs text-muted-foreground">Thinking…</div>
        )}
        {stream.error != null && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {String((stream.error as { message?: string })?.message ?? stream.error)}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t pt-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the advisor…"
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={stream.isLoading || !input.trim()}
        >
          Send
        </Button>
        {stream.isLoading && (
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
