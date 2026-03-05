import { openai } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

/**
 * Maps any model ID (including gateway-style "provider/model") to an OpenAI model.
 * All requests go directly to OpenAI — no Vercel AI Gateway needed.
 */
function resolveOpenAIModel(modelId: string): string {
  // Already a plain OpenAI model name
  if (!modelId.includes("/")) return modelId;

  // Strip "openai/" prefix
  if (modelId.startsWith("openai/")) {
    return modelId.replace(/^openai\//, "");
  }

  // Map Anthropic models → OpenAI equivalents
  if (modelId.startsWith("anthropic/claude-opus")) return "gpt-4.1";
  if (modelId.startsWith("anthropic/claude-sonnet")) return "gpt-4.1-mini";
  if (modelId.startsWith("anthropic/claude-haiku")) return "gpt-4.1-nano";
  if (modelId.startsWith("anthropic/claude-3.7-sonnet")) return "gpt-4.1-mini";

  // Map Google models → OpenAI equivalents
  if (modelId.includes("gemini-2.5-flash-lite")) return "gpt-4.1-nano";
  if (modelId.includes("gemini-3-pro")) return "gpt-4.1";
  if (modelId.includes("gemini")) return "gpt-4.1-nano";

  // Map xAI models → OpenAI equivalents
  if (modelId.includes("grok")) return "gpt-4.1-mini";

  // Fallback
  return "gpt-4.1-nano";
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  const isReasoningModel =
    modelId.includes("reasoning") || modelId.endsWith("-thinking");

  if (isReasoningModel) {
    const baseModelId = modelId.replace(THINKING_SUFFIX_REGEX, "");
    const resolved = resolveOpenAIModel(baseModelId);

    return wrapLanguageModel({
      model: openai(resolved),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  return openai(resolveOpenAIModel(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return openai("gpt-4.1-nano");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return openai("gpt-4.1-nano");
}
