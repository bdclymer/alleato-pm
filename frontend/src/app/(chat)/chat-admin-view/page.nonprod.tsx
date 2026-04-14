"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { AgentPanel } from "@/components/chat/agent-panel";
import { RagChatKitPanel } from "@/components/chat/rag-chatkit-panel";
import type { Agent, AgentEvent, GuardrailCheck } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AgentEventPayload = Omit<AgentEvent, "timestamp"> & {
  timestamp?: string | number | Date | null;
};

type GuardrailCheckPayload = Omit<GuardrailCheck, "timestamp"> & {
  timestamp?: string | number | Date | null;
};

type RagAdminStatePayload = {
  thread_id?: string | null;
  current_agent?: string;
  agents?: Agent[];
  events?: AgentEventPayload[];
  guardrails?: GuardrailCheckPayload[];
  context?: Record<string, unknown>;
};

type RagStateResult<T = RagAdminStatePayload> = {
  data: T | null;
  errorMessage: string | null;
};

function normalizeEvent(event: AgentEventPayload): AgentEvent {
  return {
    ...event,
    timestamp: new Date(event.timestamp ?? Date.now()),
  };
}

function normalizeGuardrail(check: GuardrailCheckPayload): GuardrailCheck {
  return {
    ...check,
    timestamp: new Date(check.timestamp ?? Date.now()),
  };
}

async function fetchRagBootstrapState(): Promise<RagStateResult> {
  try {
    const data = await apiFetch<RagAdminStatePayload>("/api/rag-chatkit/bootstrap");
    return { data, errorMessage: null };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | null;
      return {
        data: null,
        errorMessage:
          body?.message || "Unable to initialize AI chat bootstrap state.",
      };
    }
    return {
      data: null,
      errorMessage: "Unable to connect to the AI backend.",
    };
  }
}

async function fetchRagThreadState(threadId: string): Promise<RagStateResult> {
  try {
    const data = await apiFetch<RagAdminStatePayload>(
      `/api/rag-chatkit/state?thread_id=${threadId}`,
    );
    return { data, errorMessage: null };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | null;
      return {
        data: null,
        errorMessage:
          body?.message || "Unable to load AI chat thread state.",
      };
    }
    return {
      data: null,
      errorMessage: "Unable to connect to the AI backend.",
    };
  }
}

export default function RagHome() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      name: "classification",
      description: "Classifies user queries",
      handoffs: ["project", "internal_knowledge", "strategist"],
      tools: [],
      input_guardrails: [],
    },
    {
      name: "project",
      description: "Handles project-related queries",
      handoffs: [],
      tools: [],
      input_guardrails: [],
    },
    {
      name: "internal_knowledge",
      description: "Searches internal knowledge base",
      handoffs: [],
      tools: [],
      input_guardrails: [],
    },
    {
      name: "strategist",
      description: "Provides strategic insights",
      handoffs: [],
      tools: [],
      input_guardrails: [],
    },
  ]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string>("classification");
  const [guardrails, setGuardrails] = useState<GuardrailCheck[]>([]);
  const [context, setContext] = useState<Record<string, unknown>>({});
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null,
  );
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const hydrateState = useCallback(async (id: string | null) => {
    if (!id || isUnavailable) return;
    const { data, errorMessage } = await fetchRagThreadState(id);
    if (errorMessage) {
      setIsUnavailable(true);
      setUnavailableMessage(errorMessage);
      return;
    }
    if (!data) return;

    setCurrentAgent(data.current_agent || "classification");
    setContext((data.context as Record<string, unknown>) || {});
    if (Array.isArray(data.events)) {
      setEvents(data.events.map(normalizeEvent));
    }
    if (Array.isArray(data.guardrails)) {
      setGuardrails(data.guardrails.map(normalizeGuardrail));
    }
    if (Array.isArray(data.agents) && data.agents.length > 0) {
      setAgents(data.agents);
    }
  }, [isUnavailable]);

  useEffect(() => {
    if (threadId && !isUnavailable) {
      void hydrateState(threadId);
    }
  }, [threadId, hydrateState, isUnavailable]);

  useEffect(() => {
    (async () => {
      const { data: bootstrap, errorMessage } = await fetchRagBootstrapState();
      if (!bootstrap || errorMessage) {
        setIsUnavailable(true);
        setUnavailableMessage(
          errorMessage || "The Alleato AI backend is currently unavailable.",
        );
        setBootstrapReady(true);
        return;
      }

      setInitialThreadId(bootstrap.thread_id || null);
      setThreadId(bootstrap.thread_id || null);
      setBootstrapReady(true);
      if (Array.isArray(bootstrap.agents) && bootstrap.agents.length > 0) {
        setAgents(bootstrap.agents);
      }
      if (bootstrap.current_agent) setCurrentAgent(bootstrap.current_agent);
      if (bootstrap.context) {
        setContext(bootstrap.context as Record<string, unknown>);
      }
      if (Array.isArray(bootstrap.events)) {
        setEvents(bootstrap.events.map(normalizeEvent));
      }
      if (Array.isArray(bootstrap.guardrails)) {
        setGuardrails(bootstrap.guardrails.map(normalizeGuardrail));
      }
    })();
  }, []);

  const handleThreadChange = useCallback((id: string | null) => {
    setThreadId(id);
    if (!id) {
      setEvents([]);
      setGuardrails([]);
      setContext({});
      setCurrentAgent("classification");
    }
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (!isUnavailable) {
      void hydrateState(threadId);
    }
  }, [hydrateState, threadId, isUnavailable]);

  const handleChatError = useCallback((error: Error) => {
    setIsUnavailable(true);
    setUnavailableMessage(
      error.message || "AI chat is disabled until backend connectivity is restored.",
    );
  }, []);

  if (isUnavailable) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] gap-2 bg-muted -m-6 p-2">
        <div className="flex-1 p-4">
          <Alert>
            <AlertTitle>Alleato AI backend unavailable</AlertTitle>
            <AlertDescription>
              {unavailableMessage ||
                "AI chat is disabled until backend connectivity is restored."}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (!bootstrapReady) {
    return (
      <div className="flex items-center justify-center w-full h-[calc(100vh-64px)] text-sm text-muted-foreground">
        Connecting to Alleato AI…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] gap-2 bg-muted -m-6 p-2">
      <AgentPanel
        agents={agents}
        currentAgent={currentAgent}
        events={events}
        guardrails={guardrails}
        context={context}
      />
      <RagChatKitPanel
        initialThreadId={initialThreadId}
        onThreadChange={handleThreadChange}
        onResponseEnd={handleResponseEnd}
        onError={handleChatError}
      />
    </div>
  );
}
