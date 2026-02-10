import type { z } from "zod";
import type {
  fmGlobalFigureSchema,
  fmGlobalMatchSchema,
  fmGlobalRecommendationSchema,
  fmGlobalSpecInputSchema,
} from "@/lib/schemas/fm-global-schemas";

/**
 * Input payload for FM Global spec matching.
 */
export type FmGlobalSpecInput = z.infer<typeof fmGlobalSpecInputSchema>;

/**
 * Sprinkler requirement match from FM Global tables.
 */
export type FmGlobalMatchResult = z.infer<typeof fmGlobalMatchSchema>;

/**
 * FM Global figure summary returned with matches.
 */
export type FmGlobalFigure = z.infer<typeof fmGlobalFigureSchema>;

/**
 * Optimization recommendation from FM Global rules.
 */
export type FmGlobalRecommendation = z.infer<typeof fmGlobalRecommendationSchema>;

/**
 * Summary of a table linked to a sprinkler configuration match.
 */
export interface FmGlobalTableSummary {
  id: string;
  table_id: string;
  table_number: number;
  title: string;
  asrs_type: string;
  system_type: string;
  protection_scheme: string;
  commodity_types: string[] | null;
  container_type: string | null;
}

/**
 * Sprinkler configuration derived from FM Global data.
 */
export interface FmSprinklerConfigSummary {
  sprinkler_count: number | null;
  k_factor: number | null;
  k_factor_type: string | null;
  pressure_psi: number | null;
  pressure_bar: number | null;
  orientation: string | null;
  response_type: string | null;
  spacing_ft: number | null;
  coverage_type: string | null;
  temperature_rating: number | null;
  ceiling_height_ft: number | null;
  special_conditions: string[] | null;
  notes: string | null;
}

/**
 * Match view model for UI rendering.
 */
export interface FmGlobalMatchView {
  table: FmGlobalTableSummary;
  sprinkler: FmSprinklerConfigSummary;
  figures: FmGlobalFigure[];
  height_match_type: string | null;
}

/**
 * Stored submission summary for the FM Global form.
 */
export interface FmGlobalSubmissionSummary {
  id: string;
  created_at: string | null;
  user_input: FmGlobalSpecInput | null;
  matched_table_ids: string[] | null;
  selected_configuration: Record<string, unknown> | null;
}

/**
 * Server action response for submitted FM Global specs.
 */
export interface FmGlobalSubmissionResponse {
  submissionId: string;
  matches: FmGlobalMatchView[];
  recommendations: FmGlobalRecommendation[];
}
