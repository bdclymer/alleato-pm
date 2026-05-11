import type {
  BrandonBriefItem,
  BrandonDailyUpdatePacket,
  ExecutiveOperatingBrief,
} from "@/lib/executive/brandon-daily-update";

type WidgetAction = {
  type: string;
};

type WidgetNode = Record<string, unknown>;

type WidgetCard = {
  type: "Card";
  size: "sm" | "md" | "lg" | "full";
  status?: {
    text: string;
    icon?: string;
  };
  confirm?: {
    label: string;
    action: WidgetAction;
  };
  cancel?: {
    label: string;
    action: WidgetAction;
  };
  children: WidgetNode[];
};

function formatGeneratedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sectionLabel(key: keyof BrandonDailyUpdatePacket["sections"]): string {
  switch (key) {
    case "needsBrandon":
      return "Action items for you";
    case "waitingOnOthers":
      return "Waiting on others";
    case "importantUpdates":
      return "Critical business updates";
    default:
      return key;
  }
}

function toneToBadgeColor(
  tone: BrandonBriefItem["tone"],
): "danger" | "warning" | "success" | "secondary" {
  switch (tone) {
    case "risk":
      return "danger";
    case "watch":
      return "warning";
    case "good":
      return "success";
    default:
      return "secondary";
  }
}

function buildMetricTile(label: string, count: number, color: string): WidgetNode {
  return {
    type: "Box",
    flex: 1,
    radius: "lg",
    border: { size: 1, color: "#E5E7EB" },
    background: "#FAFAFA",
    padding: { x: 12, y: 10 },
    children: [
      {
        type: "Col",
        gap: 1,
        children: [
          {
            type: "Text",
            value: String(count),
            size: "lg",
            weight: "semibold",
            color,
          },
          {
            type: "Caption",
            value: label,
            color: "secondary",
          },
        ],
      },
    ],
  };
}

function buildItemRow(item: BrandonBriefItem, index: number): WidgetNode {
  const sourceFacts = [item.source, item.date].filter(Boolean).join(" • ");
  const bulletText = item.bullets
    .filter(Boolean)
    .slice(0, 2)
    .map((bullet) => `- ${bullet}`)
    .join("\n");

  return {
    type: "Box",
    key: `${item.sourceId ?? item.title}-${index}`,
    radius: "lg",
    border: { size: 1, color: "#E5E7EB" },
    padding: 12,
    children: [
      {
        type: "Col",
        gap: 2,
        children: [
          {
            type: "Row",
            gap: 2,
            align: "center",
            children: [
              {
                type: "Badge",
                label: item.project,
                color: "secondary",
                variant: "soft",
                size: "sm",
              },
              ...(item.status
                ? [
                    {
                      type: "Spacer",
                    },
                    {
                      type: "Badge",
                      label: item.status,
                      color: toneToBadgeColor(item.tone),
                      variant: "soft",
                      size: "sm",
                    },
                  ]
                : []),
            ],
          },
          {
            type: "Row",
            gap: 2,
            align: "start",
            children: [
              {
                type: "Col",
                flex: 1,
                gap: 1,
                children: [
                  {
                    type: "Text",
                    value: item.title,
                    weight: "semibold",
                    size: "sm",
                    color: "emphasis",
                  },
                  {
                    type: "Caption",
                    value: sourceFacts,
                    color: "secondary",
                  },
                ],
              },
            ],
          },
          {
            type: "Text",
            value: item.summary,
            size: "sm",
            color: "secondary",
          },
          ...(bulletText
            ? [
                {
                  type: "Markdown",
                  value: bulletText,
                },
              ]
            : []),
          ...(item.recommendedAction
            ? [
                {
                  type: "Row",
                  gap: 2,
                  children: [
                    {
                      type: "Text",
                      value: "Recommended move:",
                      size: "sm",
                      weight: "semibold",
                    },
                    {
                      type: "Text",
                      value: item.recommendedAction,
                      size: "sm",
                      color: "secondary",
                      flex: 1,
                    },
                  ],
                },
              ]
            : []),
          {
            type: "Row",
            gap: 2,
            children: [
              {
                type: "Button",
                label: "Create task",
                variant: "outline",
                size: "sm",
                onClickAction: {
                  type: "executive.daily_update.create_task",
                },
              },
              ...(item.sourceUrl
                ? [
                    {
                      type: "Button",
                      label: "Open source",
                      variant: "ghost",
                      size: "sm",
                      onClickAction: {
                        type: "executive.daily_update.open_source",
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
      },
    ],
  };
}

function buildSection(
  key: keyof BrandonDailyUpdatePacket["sections"],
  items: BrandonBriefItem[],
): WidgetNode {
  return {
    type: "Col",
    gap: 3,
    children: [
      {
        type: "Row",
        align: "center",
        children: [
          {
            type: "Text",
            value: sectionLabel(key),
            weight: "semibold",
            size: "sm",
          },
          {
            type: "Spacer",
          },
          {
            type: "Badge",
            label: String(items.length),
            color: items.length > 0 ? "info" : "secondary",
            variant: "soft",
            size: "sm",
            pill: true,
          },
        ],
      },
      ...(items.length > 0
        ? items.map((item, index) => buildItemRow(item, index))
        : [
            {
              type: "Box",
              radius: "lg",
              border: { size: 1, color: "#E5E7EB" },
              padding: 12,
              children: [
                {
                  type: "Text",
                  value: "No current items in this section.",
                  size: "sm",
                  color: "secondary",
                },
              ],
            },
          ]),
    ],
  };
}

function buildOperatingFocusSection(brief: ExecutiveOperatingBrief): WidgetNode {
  return {
    type: "Col",
    gap: 3,
    children: [
      {
        type: "Row",
        align: "center",
        children: [
          {
            type: "Text",
            value: "Top executive focus",
            weight: "semibold",
            size: "sm",
          },
          { type: "Spacer" },
          {
            type: "Badge",
            label: String(brief.topExecutiveFocus.length),
            color: "info",
            variant: "soft",
            size: "sm",
            pill: true,
          },
        ],
      },
      ...brief.topExecutiveFocus.map((entry, index) =>
        buildItemRow(entry.item, index),
      ),
    ],
  };
}

function buildRecommendedMovesSection(
  brief: ExecutiveOperatingBrief,
): WidgetNode {
  return {
    type: "Col",
    gap: 2,
    children: [
      {
        type: "Text",
        value: "Recommended moves",
        size: "sm",
        weight: "semibold",
      },
      {
        type: "Markdown",
        value:
          brief.recommendedMoves.length > 0
            ? brief.recommendedMoves
                .map((move, index) => `${index + 1}. ${move}`)
                .join("\n")
            : "No recommended moves generated.",
      },
    ],
  };
}

function buildOverflowSummary(brief: ExecutiveOperatingBrief): WidgetNode {
  const additionalCount = Object.values(brief.additionalMaterialItems).reduce(
    (total, items) => total + items.length,
    0,
  );
  return {
    type: "Row",
    gap: 2,
    children: [
      buildMetricTile("Additional material", additionalCount, "#175CD3"),
      buildMetricTile("Risk radar", brief.projectRiskRadar.length, "#B42318"),
      buildMetricTile("Cash / margin", brief.cashAndMarginWatch.length, "#B54708"),
    ],
  };
}

export function buildBrandonDailyUpdateWidget(
  packet: BrandonDailyUpdatePacket,
): WidgetCard {
  const actionCount = packet.sections.needsBrandon.length;
  const waitingCount = packet.sections.waitingOnOthers.length;
  const updateCount = packet.sections.importantUpdates.length;
  const operatingBrief = packet.operatingBrief;

  return {
    type: "Card",
    size: "full",
    status: {
      text: `Updated ${formatGeneratedAt(packet.generatedAt)} • last ${packet.windowDays} day(s)`,
      icon: "sparkles",
    },
    confirm: {
      label: "Draft Brandon email",
      action: {
        type: "executive.daily_update.draft_email",
      },
    },
    cancel: {
      label: "Dismiss",
      action: {
        type: "executive.daily_update.dismiss",
      },
    },
    children: [
      {
        type: "Col",
        gap: 4,
        children: [
          {
            type: "Col",
            gap: 1,
            children: [
              {
                type: "Text",
                value: "CEO operating brief for Brandon",
                size: "lg",
                weight: "semibold",
              },
              {
                type: "Text",
                value:
                  operatingBrief?.startHere.join(" ") ??
                  "A fast executive scan of what needs a decision, what is blocked on others, and what changed across the business.",
                size: "sm",
                color: "secondary",
              },
            ],
          },
          {
            type: "Row",
            gap: 2,
            children: [
              buildMetricTile("Needs Brandon", actionCount, "#B42318"),
              buildMetricTile("Waiting on others", waitingCount, "#B54708"),
              buildMetricTile("Critical updates", updateCount, "#175CD3"),
            ],
          },
          ...(operatingBrief
            ? [
                buildOverflowSummary(operatingBrief),
                {
                  type: "Divider",
                  flush: true,
                },
                buildOperatingFocusSection(operatingBrief),
                buildRecommendedMovesSection(operatingBrief),
              ]
            : []),
          {
            type: "Divider",
            flush: true,
          },
          buildSection("needsBrandon", packet.sections.needsBrandon),
          buildSection("waitingOnOthers", packet.sections.waitingOnOthers),
          buildSection("importantUpdates", packet.sections.importantUpdates),
          {
            type: "Divider",
            flush: true,
          },
          {
            type: "Col",
            gap: 2,
            children: [
              {
                type: "Text",
                value: "Retrieval notes",
                size: "sm",
                weight: "semibold",
              },
              {
                type: "Markdown",
                value: packet.retrievalNotes.map((note) => `- ${note}`).join("\n"),
              },
            ],
          },
        ],
      },
    ],
  };
}
