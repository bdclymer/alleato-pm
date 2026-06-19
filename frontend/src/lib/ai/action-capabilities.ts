// Deprecated for policy enforcement: this file is descriptive capability copy only. Runtime write approval and redaction belong to tools/outbound-action-policy.ts.
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
      "Project directory companies",
      "Project directory contacts",
      "Tasks",
      "Meeting notes",
      "Daily reports",
      "Weekly progress report drafts",
      "Outlook calendar invites",
    ],
  },
  {
    title: "Update records",
    actions: [
      "Project status",
      "RFI status",
      "Tasks",
      "Project risk flags",
      "Progress report sections",
      "Progress report photo selections and captions",
    ],
  },
  {
    title: "Prepare outputs",
    actions: [
      "Task deletion previews",
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
