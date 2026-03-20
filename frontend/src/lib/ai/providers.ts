import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1Middleware,
} from "ai";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

// ---------------------------------------------------------------------------
// AI Gateway provider (BYOK — billing stays with OpenAI, observability via Vercel)
// Falls back to direct OpenAI if AI_GATEWAY_API_KEY is not set.
// ---------------------------------------------------------------------------

const useGateway = !!process.env.AI_GATEWAY_API_KEY;

const openai = createOpenAI(
  useGateway
    ? {
        apiKey: process.env.AI_GATEWAY_API_KEY,
        baseURL: "https://ai-gateway.vercel.sh/v1",
      }
    : {
        // Direct to OpenAI (local dev fallback)
        apiKey: process.env.OPENAI_API_KEY,
      },
);

// ---------------------------------------------------------------------------
// DevTools middleware (local dev only — shows every step, tool call, prompt)
// Run `npx @ai-sdk/devtools` then open http://localhost:4983
// ---------------------------------------------------------------------------

let devToolsMiddlewareFn: (() => LanguageModelV1Middleware) | null = null;
if (process.env.NODE_ENV === "development") {
  try {
    // Dynamic import so it's never bundled for production
    devToolsMiddlewareFn = require("@ai-sdk/devtools").devToolsMiddleware;
  } catch {
    // Package not installed — skip silently
  }
}

/**
 * Wraps a model with DevTools middleware in development.
 * In production, returns the model as-is (zero overhead).
 */
function withDevTools(model: ReturnType<typeof openai.chat>) {
  if (devToolsMiddlewareFn) {
    return wrapLanguageModel({ model, middleware: devToolsMiddlewareFn() });
  }
  return model;
}

/**
 * Ensures a model ID has the "openai/" prefix required by AI Gateway.
 * Direct OpenAI calls also accept this format (it's ignored).
 */
function ensureProviderPrefix(modelId: string): string {
  if (modelId.includes("/")) return modelId;
  return `openai/${modelId}`;
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

    return wrapLanguageModel({
      model: openai.chat(ensureProviderPrefix(baseModelId)),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  // Use openai.chat() to route through /v1/chat/completions.
  // The default openai() uses /v1/responses which has known validation
  // bugs in the AI Gateway for multi-step tool calling.
  return withDevTools(openai.chat(ensureProviderPrefix(modelId)));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return withDevTools(openai.chat("openai/gpt-4.1-nano"));
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return withDevTools(openai.chat("openai/gpt-4.1-nano"));
}

/**
 * Shared OpenAI-compatible client for embeddings via AI Gateway.
 * Re-exported so services that use the raw OpenAI SDK for embeddings
 * can also route through the gateway for observability.
 */
export { openai as gatewayProvider };
