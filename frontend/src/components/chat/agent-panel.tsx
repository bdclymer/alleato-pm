"use client";

import type { Agent, AgentEvent, GuardrailCheck } from "@/lib/types";
import { AgentsList } from "./agents-list";
import { Guardrails } from "../misc/guardrails";
import { ConversationContext } from "./conversation-context";
import { RunnerOutput } from "../misc/runner-output";

interface AgentPanelProps {
  agents: Agent[];
  currentAgent: string;
  events: AgentEvent[];
  guardrails: GuardrailCheck[];
  context: {
    passenger_name?: string;
    confirmation_number?: string;
    seat_number?: string;
    flight_number?: string;
    account_number?: string;
  };
}

export function AgentPanel({
  agents,
  currentAgent,
  events,
  guardrails,
  context,
}: AgentPanelProps) {
  const runnerEvents = events.filter((e) => e.type !== "message");

  return (
    <div
      data-testid="agent-panel"
      className="w-3/5 h-full flex flex-col bg-[#f7f7f8] rounded-xl overflow-hidden"
    >
      <div className="bg-primary text-primary-foreground h-12 px-5 flex items-center gap-3 shrink-0">
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <h1 className="font-semibold text-sm tracking-tight">Agent View</h1>
        <span className="ml-auto text-xs opacity-70 font-normal">
          Alleato&nbsp;AI
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2">
        <AgentsList agents={agents} currentAgent={currentAgent} />
        <Guardrails
          guardrails={guardrails}
          inputGuardrails={activeAgent(agents, currentAgent)?.input_guardrails ?? []}
        />
        <ConversationContext context={context} />
        <RunnerOutput runnerEvents={runnerEvents} />
      </div>
    </div>
  );
}

function activeAgent(agents: Agent[], currentAgent: string) {
  return agents.find((a) => a.name === currentAgent);
}
