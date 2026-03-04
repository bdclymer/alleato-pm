"use client";

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { PanelSection } from "../misc/panel-section";
import type { Agent } from "@/lib/types";
import { BackendStatusIndicator } from "@/components/misc/backend-status-indicator";

interface AgentsListProps {
  agents: Agent[];
  currentAgent: string;
}

function agentInitials(name: string) {
  return name
    .split(/[\s_-]/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

export function AgentsList({ agents, currentAgent }: AgentsListProps) {
  const activeAgent = agents.find((a) => a.name === currentAgent);
  return (
    <PanelSection
      title="Available Agents"
      icon={<Users className="h-3.5 w-3.5" />}
    >
      <BackendStatusIndicator />
      <div className="space-y-1">
        {agents.map((agent, idx) => {
          const isActive = agent.name === currentAgent;
          const isAvailable =
            isActive || (activeAgent?.handoffs.includes(agent.name) ?? false);
          return (
            <div
              key={`${agent.name || "agent"}-${idx}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-primary/8"
                  : isAvailable
                    ? "hover:bg-muted/60"
                    : "opacity-40 cursor-not-allowed"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {agentInitials(agent.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight truncate">
                  {agent.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.description}
                </p>
              </div>
              {isActive && (
                <Badge className="shrink-0 bg-primary/10 text-primary hover:bg-primary/10 text-[10px] px-1.5 py-0 font-medium border-0">
                  Active
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}
