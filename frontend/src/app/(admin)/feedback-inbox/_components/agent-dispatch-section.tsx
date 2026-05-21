"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import type { AgentTarget, FeedbackItem } from "../types";
import {
  agentLabel,
  getAssignedAgent,
  getDispatchHistory,
  getDispatchStatus,
  getDispatchTrigger,
  relativeTime,
} from "../helpers";

export function AgentDispatchSection({
  item,
  dispatching,
  onDispatch,
}: {
  item: FeedbackItem;
  dispatching: boolean;
  onDispatch: (id: string, target: AgentTarget) => void;
}) {
  const dispatchStatus = getDispatchStatus(item);
  const dispatchTrigger = getDispatchTrigger(item);
  const history = getDispatchHistory(item);
  const lastDispatch = history[0] ?? null;
  const [target, setTarget] = useState<AgentTarget>(
    () => getAssignedAgent(item) ?? "codex",
  );

  useEffect(() => {
    setTarget(getAssignedAgent(item) ?? "codex");
  }, [item.id, item.metadata]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Select value={target} onValueChange={(value) => setTarget(value as AgentTarget)}>
          <SelectTrigger
            aria-label="Agent target"
            size="sm"
            className="h-7 w-32 px-2 text-xs font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="codex">Codex</SelectItem>
            <SelectItem value="claude_code">Claude Code</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="link"
          size="xs"
          onClick={() => onDispatch(item.id, target)}
          disabled={dispatching}
          className="h-auto p-0 text-xs font-medium"
        >
          {dispatching ? "Dispatching..." : "Dispatch"}
        </Button>
      </div>

      {(dispatchStatus || lastDispatch) && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {dispatchStatus && (
            <span>
              Dispatch:{" "}
              <span className="font-medium text-foreground">{dispatchStatus}</span>
            </span>
          )}
          {dispatchTrigger && (
            <>
              <span className="text-border">/</span>
              <span>{dispatchTrigger}</span>
            </>
          )}
          {lastDispatch && (
            <>
              <span className="text-border">/</span>
              <span>
                Last sent to {agentLabel(lastDispatch.target)}{" "}
                {relativeTime(lastDispatch.at)}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
