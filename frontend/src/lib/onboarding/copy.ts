export const WELCOME_ONBOARDING_STORAGE_KEY = "alleato_onboarding_completed_v3";
export const ONBOARDING_VISIBILITY_EVENT = "alleato:onboarding-visibility";

export type OnboardingInsightKind = "pattern" | "risk" | "decision";

export type OnboardingInsight = {
  kind: OnboardingInsightKind;
  text: string;
  meta: string;
};

export type MomentumStats = {
  fixesShipped: number;
  activeTesters: number;
  launchesThisWeek: number;
};

export const onboardingCopy = {
  shell: {
    eyebrow: "Alleato OS · Welcome",
    skip: "Skip tour",
    back: "Back",
    continue: "Continue",
    startExploring: "Start exploring",
  },
  foundation: {
    badge: "Internal beta · You're shaping this",
    headline: "You're not testing software. You're shaping it.",
    body:
      "Whatever you've ever wanted a platform like this to do — this is where it gets built. Some of what's here will feel rough. That's the point: you're seeing it in the bones, so what gets built next is what you actually need.",
    pact: {
      title: "The Tester Pact",
      items: [
        "I'll click Ask Alleato instead of guessing.",
        "I'll say specifically what's missing — especially for construction.",
        "I'll watch how fast things move when I speak up.",
      ],
    },
    statLabels: {
      fixesShipped: "fixes shipped this month",
      activeTesters: "testers active",
      launchesThisWeek: "launches this week",
    },
  },
  wow: {
    badge: "What Procore can't do",
    headlineWithName: (name: string) => `Hey ${name}. I read your last 14 meetings.`,
    headlineFallback: "I read your last 14 meetings.",
    body:
      "Every meeting. Every transcript. Three patterns that didn't exist in any single document:",
    closer:
      "This isn't a one-time demo. Your AI assistant lives in the bottom-right of every page — ask it anything, anytime.",
  },
  widget: {
    headline: "One widget. Two superpowers.",
    body:
      "The pill in the bottom-right travels with you on every page. Ask the AI anything, or send feedback when something's off.",
    askTab: "Ask AI",
    feedbackTab: "Send feedback",
    tryAsking: "Try asking",
    examples: [
      "What's blocking the Tampa project?",
      "Show me overdue RFIs assigned to me",
      "Summarize last week's owner meeting",
    ],
    inputPlaceholder: "Ask anything about your projects...",
    feedbackPlaceholder: "Bug, idea, or just confused — anything works",
    previewNote: "Click the tabs above to preview both modes.",
    feedbackFooter: "Every submission lands on the Client Feedback page within seconds.",
  },
  mission: {
    badge: "Ready when you are",
    headline: "Set up your first test project.",
    body:
      "Walk through it like a real project — create it, add a meeting, run an RFI. Note what feels off as you go. Tell us in the widget.",
    cta: "Create your first test project",
    ctaMeta: "Takes about 90 seconds. Real workflow, real data.",
    helperTitle: "Stuck or confused?",
    helperBody:
      "Click Ask Alleato in the bottom-right corner. The AI knows your projects, your meetings, and how the platform works. Use it like a teammate.",
    footer: "At the end of today, you'll see how much time the AI saved you.",
  },
};

export const defaultOnboardingInsights: OnboardingInsight[] = [
  {
    kind: "pattern",
    text: "Fire suppression appeared in 9 of 14 meetings. It isn't on any agenda or RFI.",
    meta: "4 projects · trending up",
  },
  {
    kind: "risk",
    text: "RFI #047 was discussed 4 times across 3 weeks. Still unresolved. Owner: not assigned.",
    meta: "Surfaced from transcripts",
  },
  {
    kind: "decision",
    text: "On 4/12 the team agreed to switch to Type-K connectors. Not in any document, contract, or submittal.",
    meta: "Auto-extracted",
  },
];

export const defaultMomentumStats: MomentumStats = {
  fixesShipped: 47,
  activeTesters: 12,
  launchesThisWeek: 3,
};
