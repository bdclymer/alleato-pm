function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

export type PreviewReviewField = {
  key: string;
  label: string;
  value: string | null;
  helper?: string;
  required?: boolean;
  generated?: boolean;
};

export type PreviewReviewGroup = {
  title: string;
  fields: PreviewReviewField[];
};

export function getPreviewReviewGroups(
  preview: Record<string, unknown> | null,
): PreviewReviewGroup[] {
  const reviewCard = asObject(preview?.reviewCard);
  const groups = Array.isArray(reviewCard.groups) ? reviewCard.groups : [];

  return groups
    .map((group) => {
      const groupRecord = asObject(group);
      const fields = Array.isArray(groupRecord.fields)
        ? groupRecord.fields
        : [];
      const reviewFields: PreviewReviewField[] = fields.flatMap((field) => {
        const fieldRecord = asObject(field);
        const key = toStringValue(fieldRecord.key);
        const label = toStringValue(fieldRecord.label);
        if (!key || !label) return [];

        return [
          {
            key,
            label,
            value: toStringValue(fieldRecord.value),
            helper: toStringValue(fieldRecord.helper) ?? undefined,
            required: fieldRecord.required === true,
            generated: fieldRecord.generated === true,
          },
        ];
      });

      return {
        title: toStringValue(groupRecord.title) ?? "Fields",
        fields: reviewFields,
      };
    })
    .filter((group) => group.fields.length > 0);
}
