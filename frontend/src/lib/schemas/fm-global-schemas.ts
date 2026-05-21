import { z } from "zod";

const asrsTypes = [
  "Shuttle",
  "Mini-Load",
  "Top-Loading",
  "Vertically-Enclosed",
  "All",
] as const;

const systemTypes = ["wet", "dry", "preaction", "both"] as const;

// container_type accepts any string so the public form can capture
// free-text values (e.g. "Other → specify"). The DB column is already text.

const numberOrNull = z.preprocess((value) => {
  if (value === "" || value === undefined) return null;
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().nullable());

/**
 * Branded table identifier for FM Global table references.
 */
export const fmGlobalTableIdSchema = z.string().min(1).brand<"FmGlobalTableId">();

/**
 * Branded figure identifier for FM Global figure references.
 */
export const fmGlobalFigureIdSchema = z
  .string()
  .uuid()
  .brand<"FmGlobalFigureId">();

/**
 * Input schema for FM Global sprinkler specification matching.
 */
export const fmGlobalSpecInputSchema = z.object({
  asrs_type: z.enum(asrsTypes),
  system_type: z.enum(systemTypes),
  ceiling_height_ft: z.number().min(1),
  commodity_class: z.string().min(1).optional(),
  k_factor: z.number().min(0).optional(),
  tolerance_ft: z.number().min(0).default(5),
  container_type: z.string().min(1).optional(),
  storage_height_ft: z.number().min(0).optional(),
  rack_row_depth_ft: z.number().min(0).optional(),
  building_heated: z.boolean().optional(),
});

/**
 * Result schema for sprinkler requirement matching.
 */
export const fmGlobalMatchSchema = z.object({
  table_id: fmGlobalTableIdSchema,
  table_number: z.number(),
  title: z.string(),
  sprinkler_count: numberOrNull.optional(),
  k_factor: numberOrNull.optional(),
  k_type: z.string().nullable().optional(),
  pressure_psi: numberOrNull.optional(),
  pressure_bar: numberOrNull.optional(),
  sprinkler_orientation: z.string().nullable().optional(),
  sprinkler_response: z.string().nullable().optional(),
  ceiling_height_ft: numberOrNull.optional(),
  special_conditions: z.array(z.string()).nullable().optional(),
  height_match_type: z.string().nullable().optional(),
});

/**
 * Result schema for FM Global figures referenced in results.
 */
export const fmGlobalFigureSchema = z.object({
  id: fmGlobalFigureIdSchema,
  figure_number: z.number(),
  title: z.string(),
  figure_type: z.string(),
  image: z.string().nullable(),
  related_tables: z.array(z.number()).nullable(),
  asrs_type: z.string(),
  container_type: z.string().nullable(),
});

/**
 * Result schema for optimization recommendations.
 */
export const fmGlobalRecommendationSchema = z.object({
  recommendation: z.string(),
  savings_potential: numberOrNull,
  priority: z.string(),
  implementation_effort: z.string(),
  technical_details: z.unknown().nullable(),
});

/**
 * Table summary schema for FM Global tables.
 */
export const fmGlobalTableSummarySchema = z.object({
  id: z.string().uuid().brand<"FmGlobalTableRowId">(),
  table_id: fmGlobalTableIdSchema,
  table_number: z.number(),
  title: z.string(),
  asrs_type: z.string(),
  system_type: z.string(),
  protection_scheme: z.string(),
  commodity_types: z.array(z.string()).nullable(),
  container_type: z.string().nullable(),
  figures: z.string().uuid().nullable(),
});

/**
 * Sprinkler configuration schema for FM Global matches.
 */
export const fmSprinklerConfigSchema = z.object({
  table_id: fmGlobalTableIdSchema,
  sprinkler_count: numberOrNull,
  k_factor: numberOrNull,
  k_factor_type: z.string().nullable(),
  pressure_psi: numberOrNull,
  pressure_bar: numberOrNull,
  orientation: z.string().nullable(),
  response_type: z.string().nullable(),
  spacing_ft: numberOrNull,
  coverage_type: z.string().nullable(),
  temperature_rating: numberOrNull,
  ceiling_height_ft: numberOrNull,
  special_conditions: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
});
