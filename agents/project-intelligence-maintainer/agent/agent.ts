import { defineAgent } from "eve";

export default defineAgent({
  model: process.env.EVE_PROJECT_INTELLIGENCE_MODEL ?? "openai/gpt-5.4-mini",
  reasoning: "low",
});
