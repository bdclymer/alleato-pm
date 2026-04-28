import "server-only";

import { defaultOnboardingInsights, type OnboardingInsight } from "@/lib/onboarding/copy";

export async function getOnboardingInsights(_userId: string): Promise<OnboardingInsight[]> {
  // The attended-meeting RAG summarizer is intentionally not faked here. Until
  // the per-user attendance query and structured-output endpoint are wired,
  // the onboarding uses the documented Tampa fallback instead of pretending to
  // have read meetings it did not read.
  return defaultOnboardingInsights;
}
