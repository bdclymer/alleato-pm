"use client";

import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { PanelSection } from "./panel-section";
import type { GuardrailCheck } from "@/lib/types";

interface GuardrailsProps {
  guardrails: GuardrailCheck[];
  inputGuardrails: string[];
}

export function Guardrails({ guardrails, inputGuardrails }: GuardrailsProps) {
  const guardrailNameMap: Record<string, string> = {
    relevance_guardrail: "Relevance Guardrail",
    jailbreak_guardrail: "Jailbreak Guardrail",
  };

  const guardrailDescriptionMap: Record<string, string> = {
    "Relevance Guardrail": "Ensures messages are relevant to scope",
    "Jailbreak Guardrail": "Blocks attempts to bypass system instructions",
  };

  const extractGuardrailName = (rawName: string): string =>
    guardrailNameMap[rawName] ?? rawName;

  const guardrailsToShow: GuardrailCheck[] = inputGuardrails.map((rawName) => {
    const existing = guardrails.find((gr) => gr.name === rawName);
    if (existing) return existing;
    return {
      id: rawName,
      name: rawName,
      input: "",
      reasoning: "",
      passed: false,
      timestamp: new Date(),
    };
  });

  return (
    <PanelSection
      title="Guardrails"
      icon={<Shield className="h-3.5 w-3.5" />}
    >
      <div className="space-y-1">
        {guardrailsToShow.map((gr) => {
          const label = extractGuardrailName(gr.name);
          const passed = !gr.input || gr.passed;
          return (
            <div
              key={gr.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${!gr.input ? "opacity-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {guardrailDescriptionMap[label] ?? gr.input}
                </p>
              </div>
              {passed ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Pass</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Fail</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}
