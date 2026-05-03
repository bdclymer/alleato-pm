export type AssistantActionCapability = {
  title: string;
  actions: string[];
};

export const ASSISTANT_ACTION_CAPABILITIES: AssistantActionCapability[] = [
  {
    title: "Create records",
    actions: [
      "RFIs",
      "Submittals",
      "Change events",
      "Prime contract change orders",
      "Commitments",
      "Tasks",
      "Meeting notes",
      "Daily reports",
      "Weekly progress report drafts",
    ],
  },
  {
    title: "Update records",
    actions: [
      "Project status",
      "RFI status",
      "Project risk flags",
      "Progress report sections",
      "Progress report photo selections and captions",
    ],
  },
  {
    title: "Prepare outputs",
    actions: [
      "Progress report PDF preview links",
      "Progress report PDF downloads",
      "Project summaries",
      "Executive initiative cards",
    ],
  },
  {
    title: "Save knowledge",
    actions: [
      "Project insights",
      "Company knowledge-base entries",
      "Assistant memory notes",
    ],
  },
];
