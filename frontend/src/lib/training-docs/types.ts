import type {
  TrainingDocAssetType,
  TrainingDocAudience,
  TrainingDocStatus,
} from "./constants";

export interface TrainingDocAsset {
  id: string;
  training_doc_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  asset_type: TrainingDocAssetType;
  caption: string | null;
  alt_text: string | null;
  step_order: number;
  created_at: string;
  updated_at: string;
  signed_url: string | null;
}

export interface TrainingDocRecord {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  title: string;
  slug: string;
  summary: string | null;
  body_markdown: string;
  audience: TrainingDocAudience;
  status: TrainingDocStatus;
  source_route: string | null;
  review_notes: string | null;
  target_collection: string;
  published_doc_path: string | null;
  last_published_at: string | null;
  last_publish_error: string | null;
  metadata: Record<string, unknown>;
}

export interface TrainingDocWithAssets extends TrainingDocRecord {
  assets: TrainingDocAsset[];
}
