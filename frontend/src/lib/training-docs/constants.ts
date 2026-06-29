export const TRAINING_DOC_AUDIENCES = [
  "internal",
  "client",
  "subcontractor",
  "admin",
] as const;

export const TRAINING_DOC_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "published",
  "archived",
] as const;

export const TRAINING_DOC_ASSET_TYPES = ["screenshot", "image"] as const;

export type TrainingDocAudience = (typeof TRAINING_DOC_AUDIENCES)[number];
export type TrainingDocStatus = (typeof TRAINING_DOC_STATUSES)[number];
export type TrainingDocAssetType = (typeof TRAINING_DOC_ASSET_TYPES)[number];

export const TRAINING_DOC_DEFAULT_COLLECTION =
  "project-management-tools/training-docs";
export const TRAINING_DOC_INDEX_PATH = `${TRAINING_DOC_DEFAULT_COLLECTION}/index.mdx`;
export const TRAINING_DOC_NAV_PAGE =
  "project-management-tools/training-docs/index";
export const TRAINING_DOC_IMAGE_ROOT = "images/training-docs";
export const TRAINING_DOC_STORAGE_BUCKET = "documents";

export function slugifyTrainingDoc(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTrainingDocSlug(
  value: string,
  fallbackTitle?: string,
): string {
  const normalized = slugifyTrainingDoc(value);
  if (normalized) return normalized;
  if (fallbackTitle) return slugifyTrainingDoc(fallbackTitle);
  return "";
}
