// Single source of truth for assistant system-prompt assembly. The strategist
// prompt itself lives in @/lib/ai/agents/strategist; orchestrator wraps it with
// council-mode injection in getStrategistSystemPrompt; bot-core composes that
// with memory/learning/workspace context in assembleSystemPrompt. This module
// re-exports the composed function and adds a dev-only token-count log so
// context bloat surfaces in local logs before it overflows in production.

import {
  assembleSystemPrompt as baseAssembleSystemPrompt,
  type BotLearningUsageSummary,
  type MemoryUsageSummary,
} from "@/lib/ai/bot-core";
import { getStrategistSystemPrompt } from "@/lib/ai/orchestrator";

export { getStrategistSystemPrompt };
export type { BotLearningUsageSummary, MemoryUsageSummary };

export type AssembleSystemPromptOptions = Parameters<typeof baseAssembleSystemPrompt>[0];

export async function assembleSystemPrompt(
  options: AssembleSystemPromptOptions,
): Promise<string> {
  const prompt = await baseAssembleSystemPrompt(options);
  logSystemPromptTokensInDev(prompt, "assembleSystemPrompt");
  return prompt;
}

// Heuristic ~4 chars/token. Cheap signal so context overflow shows up locally
// before it costs money in production.
export function logSystemPromptTokensInDev(prompt: string, label: string): void {
  if (process.env.NODE_ENV === "production") return;
  const approxTokens = Math.ceil(prompt.length / 4);
  console.log(
    `[system-prompt] ${label} approx tokens=${approxTokens} chars=${prompt.length}`,
  );
}
