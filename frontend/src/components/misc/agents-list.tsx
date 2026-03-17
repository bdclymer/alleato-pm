"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelSection } from "./panel-section";
import type { Agent } from "@/lib/types";

interface AgentsListProps {
  agents: Agent[];
  currentAgent: string;
}

export function AgentsList({ agents, currentAgent }: AgentsListProps) {
  const activeAgent = agents.find((a) => a.name === currentAgent);
  return (
    <PanelSection
      title="Available Agents"
      icon={<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">A</span>}
    >
      <div className="grid grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card
            key={agent.name}
            className={`bg-background border-border h-[130px] transition-all ${
              agent.name === currentAgent ||
              activeAgent?.handoffs.includes(agent.name)
                ? ""
                : "opacity-50 filter grayscale cursor-not-allowed pointer-events-none"
            } ${
              agent.name === currentAgent
                ? "ring-1 ring-primary shadow-sm"
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
                <Badge className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
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
