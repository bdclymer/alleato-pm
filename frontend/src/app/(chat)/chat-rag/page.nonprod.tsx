"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { RagChatKitPanel } from "@/components/chat/rag-chatkit-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type RagStatePayload = {
  thread_id?: string | null;
  current_agent?: string;
  context?: {
    backend_status?: string;
    notice?: string;
    [key: string]: unknown;
  };
};

type RagStateResult<T = RagStatePayload> = {
  data: T | null;
  errorMessage: string | null;
};

async function fetchRagBootstrapState(): Promise<RagStateResult> {
  try {
    const data = await apiFetch<RagStatePayload>("/api/rag-chatkit/bootstrap");
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
    const data = await apiFetch<RagStatePayload>(
      `/api/rag-chatkit/state?thread_id=${threadId}`,
    );
    return { data, errorMessage: null };
  } catch (err) {
    if (err instanceof ApiError) {
      const body = err.body as { message?: string } | null;
      return {
        data: null,
        errorMessage: body?.message || "Unable to load AI chat thread state.",
      };
    }
    return {
      data: null,
      errorMessage: "Unable to connect to the AI backend.",
    };
  }
}

export default function RagHome() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initialThreadId, setInitialThreadId] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null,
  );
  const [bootstrapReady, setBootstrapReady] = useState(false);

  const hydrateState = useCallback(
    async (id: string | null) => {
      if (!id || isUnavailable) return;
      const { data, errorMessage } = await fetchRagThreadState(id);
      if (errorMessage) {
        setIsUnavailable(true);
        setUnavailableMessage(errorMessage);
        return;
      }
      if (!data) return;
    },
    [isUnavailable],
  );

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
    })();
  }, []);

  const handleThreadChange = useCallback((id: string | null) => {
    setThreadId(id);
  }, []);

  const handleResponseEnd = useCallback(() => {
    if (!isUnavailable) {
      void hydrateState(threadId);
    }
  }, [hydrateState, threadId, isUnavailable]);

  if (isUnavailable) {
    return (
      <div
        className="flex w-full -mx-4 sm:-mx-6 lg:-mx-8 -my-6"
        style={{ height: "calc(100vh - 64px)" }}
      >
        <div className="flex flex-col flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 gap-4">
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
    <div
      className="flex w-full -mx-4 sm:-mx-6 lg:-mx-8 -my-6"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <RagChatKitPanel
        initialThreadId={initialThreadId}
        onThreadChange={handleThreadChange}
        onResponseEnd={handleResponseEnd}
      />
    </div>
  );
}
