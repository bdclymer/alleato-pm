"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot } from "lucide-react";
import { PanelSection } from "../misc/panel-section";
import type { Agent } from "@/lib/types";
import { BackendStatusIndicator } from "@/components/misc/backend-status-indicator";

interface AgentsListProps {
  agents: Agent[];
  currentAgent: string;
}

export function AgentsList({ agents, currentAgent }: AgentsListProps) {
  const activeAgent = agents.find((a) => a.name === currentAgent);
  return (
    <PanelSection
      title="Available Agents"
      icon={<Bot className="h-4 w-4 text-orange-600" />}
    >
      <BackendStatusIndicator />
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent, idx) => (
          <Card
            key={`${agent.name || "agent"}-${idx}`}
            className={`bg-background border-border transition-all ${
              agent.name === currentAgent ||
              activeAgent?.handoffs.includes(agent.name)
                ? ""
                : "opacity-50 filter grayscale cursor-not-allowed pointer-events-none"
            } ${
              agent.name === currentAgent
                ? "ring-1 ring-brand shadow-md"
                : ""
            }`}
          >
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-sm flex items-center text-zinc-900">
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <p className="text-xs font-light text-zinc-500">
                {agent.description}
              </p>
              {agent.name === currentAgent && (
                <Badge className="mt-2 bg-orange-600 hover:bg-orange-700 text-white">
                  Active
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
