"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDownIcon } from "lucide-react";

export interface ToolTraceItem {
  tool?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
  timestamp?: string;
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncate(text: string, max = 600): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

interface TracePanelProps {
  traces: ToolTraceItem[];
}

export function TracePanel({ traces }: TracePanelProps) {
  if (!traces.length) return null;

  return (
    <Collapsible className="mt-2 rounded-md border border-border/60 bg-muted/30 p-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Trace ({traces.length} tool calls)</span>
        <ChevronDownIcon className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {traces.map((trace, index) => {
          const inputText = truncate(toPrettyJson(trace.input ?? {}));
          const outputText = truncate(
            toPrettyJson(trace.error ? { error: trace.error } : trace.output),
          );
          return (
            <div
              key={`${trace.tool ?? "tool"}-${trace.timestamp ?? index}`}
              className="rounded-md border border-border/50 bg-background p-2"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {trace.tool ?? "unknown_tool"}
                </Badge>
                {trace.error ? (
                  <Badge variant="destructive" className="text-[10px]">
                    error
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    success
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Input
                  </p>
                  <pre className="overflow-x-auto text-[11px] whitespace-pre-wrap break-words text-foreground/90">
                    {inputText}
                  </pre>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    Output
                  </p>
                  <pre className="overflow-x-auto text-[11px] whitespace-pre-wrap break-words text-foreground/90">
                    {outputText}
                  </pre>
                </div>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
