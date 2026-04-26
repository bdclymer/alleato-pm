import type {
  AlleatoAiUserProfile,
  AlleatoAiWorkflow,
} from "@/config/aiPersonalization";

export type AlleatoAiActionId =
  | "command-center"
  | "recommended-project"
  | "client-update"
  | "risk-review"
  | "today-priorities"
  | "handoffs"
  | "feedback"
  | "explore";

export type AlleatoAiAction = {
  id: AlleatoAiActionId;
  label: string;
  href?: string;
};

export type AlleatoAiWelcomeMessage = {
  greeting: string;
  relevance: string;
  coCreation: string;
  feedbackGuidance: string;
  suggestedNextStep: string;
};

export const OPEN_ALLEATO_AI_FEEDBACK_EVENT = "alleato-ai:open-feedback";

const workflowCopy: Record<
  AlleatoAiWorkflow,
  {
    relevance: (profile: AlleatoAiUserProfile) => string;
    suggestedNextStep: (profile: AlleatoAiUserProfile) => string;
    actions: AlleatoAiAction[];
    scriptedResponse: string;
  }
> = {
  "executive-command-center": {
    relevance: (profile) =>
      `I will help you get oriented around ${joinReadableList(
        profile.focusAreas,
      ).toLowerCase()}, with emphasis on project health, risk signals, and decisions that need attention.`,
    suggestedNextStep: () =>
      "I suggest we start with your command center view, then look at a project with active risk signals so you can see how summaries and client updates can work together.",
    actions: [
      { id: "command-center", label: "Show my command center", href: "/financial-insights" },
      { id: "recommended-project", label: "Open recommended project" },
      { id: "client-update", label: "Draft a client update", href: "/1/emails" },
      { id: "feedback", label: "Share feedback" },
      { id: "explore", label: "Explore on my own" },
    ],
    scriptedResponse:
      "For an executive pass, start with portfolio health, risk indicators, and any project that needs a decision. This demo assistant is using scripted guidance from your test profile.",
  },
  "project-manager-daily-priorities": {
    relevance: (profile) =>
      `I will help you scan ${joinReadableList(
        profile.focusAreas,
      ).toLowerCase()}, especially blockers, ownership, and what should move today.`,
    suggestedNextStep: () =>
      "I suggest we start inside the recommended project, then review the project home and task-related workflows from a daily priority lens.",
    actions: [
      { id: "recommended-project", label: "Open recommended project" },
      { id: "today-priorities", label: "Show today's priorities", href: "/1/tasks" },
      { id: "risk-review", label: "Review projects at risk", href: "/financial-insights" },
      { id: "feedback", label: "Share feedback" },
      { id: "explore", label: "Explore on my own" },
    ],
    scriptedResponse:
      "For a project manager pass, focus on what changed, what is blocked, and who owns the next step. This is demo-safe guidance, not a live AI response.",
  },
  "client-update-drafting": {
    relevance: (profile) =>
      `I will help you turn ${joinReadableList(
        profile.focusAreas,
      ).toLowerCase()} into clear updates, summaries, and follow-ups.`,
    suggestedNextStep: () =>
      "I suggest we begin with client communication, then use a project view to imagine how AI-drafted updates should pull from activity, documents, and risks.",
    actions: [
      { id: "client-update", label: "Draft a client update", href: "/1/emails" },
      { id: "recommended-project", label: "Open recommended project" },
      { id: "command-center", label: "Show project health", href: "/financial-insights" },
      { id: "feedback", label: "Share feedback" },
      { id: "explore", label: "Explore on my own" },
    ],
    scriptedResponse:
      "For client-facing work, look for where an update should gather schedule changes, decisions, documents, and risk notes. This scripted response is based on your profile.",
  },
  "operations-handoff-review": {
    relevance: (profile) =>
      `I will help you inspect ${joinReadableList(
        profile.focusAreas,
      ).toLowerCase()}, with special attention to overdue work, ownership, and repeatable processes.`,
    suggestedNextStep: () =>
      "I suggest we start with workload and handoff visibility, then open a project area where unclear ownership would show up quickly.",
    actions: [
      { id: "handoffs", label: "Review handoffs", href: "/1/tasks" },
      { id: "risk-review", label: "Review projects at risk", href: "/financial-insights" },
      { id: "recommended-project", label: "Open recommended project" },
      { id: "feedback", label: "Share feedback" },
      { id: "explore", label: "Explore on my own" },
    ],
    scriptedResponse:
      "For operations, scan for overdue work, unclear owners, and handoffs that should be more visible. This assistant is currently using scripted demo responses.",
  },
};

export const alleatoAiPromptChips = [
  "What should I focus on today?",
  "Which projects need attention?",
  "Summarize this project.",
  "Draft a client update.",
  "What changed this week?",
  "How should I explore the app?",
  "I have feedback.",
];

export function buildAlleatoAiWelcome(
  profile: AlleatoAiUserProfile,
): AlleatoAiWelcomeMessage {
  const workflow = workflowCopy[profile.recommendedWorkflow];

  return {
    greeting: `Welcome, ${profile.displayName}. I am Alleato AI.`,
    relevance: workflow.relevance(profile),
    coCreation:
      "You are one of the first people exploring this experience. We are shaping it with the people who will actually use it, and your perspective will help decide what gets clearer, faster, and more useful from here.",
    feedbackGuidance:
      "As you explore, use the feedback icon anytime something feels off, unclear, or missing. Wishlist ideas are just as helpful as issue reports, especially when you can tell us how you wish the app worked.",
    suggestedNextStep: workflow.suggestedNextStep(profile),
  };
}

export function buildAlleatoAiActions(
  profile: AlleatoAiUserProfile,
): AlleatoAiAction[] {
  return workflowCopy[profile.recommendedWorkflow].actions.map((action) =>
    action.id === "recommended-project"
      ? { ...action, href: profile.recommendedProjectPath }
      : action,
  );
}

export function buildAlleatoAiScriptedResponse(
  profile: AlleatoAiUserProfile,
  prompt: string,
  pathname: string,
) {
  if (/feedback|issue|wishlist/i.test(prompt)) {
    return "Use Share feedback to send an issue, wishlist idea, or general thought with this page attached as context.";
  }

  if (/explore/i.test(prompt)) {
    return `A good first pass for ${profile.displayName} is ${joinReadableList(
      profile.focusAreas,
    ).toLowerCase()}, then the recommended workflow. I can keep pointing you to the next useful area as you move through the app.`;
  }

  if (/client update/i.test(prompt)) {
    return "For a client update, look for what changed, what needs a decision, and what should be communicated clearly. In this demo mode, I can point you to the update workflow without generating live AI content.";
  }

  if (/attention|risk|focus|changed/i.test(prompt)) {
    return workflowCopy[profile.recommendedWorkflow].scriptedResponse;
  }

  return `You are on ${pathname || "the app home"}. I can suggest next steps based on your profile, but responses are scripted for this testing build.`;
}

function joinReadableList(items: string[]) {
  if (items.length === 0) return "the areas most relevant to you";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
