"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/types/database.types";
import {
  fmGlobalFigureSchema,
  fmGlobalMatchSchema,
  fmGlobalRecommendationSchema,
  fmGlobalSpecInputSchema,
  fmGlobalTableSummarySchema,
  fmSprinklerConfigSchema,
} from "@/lib/schemas/fm-global-schemas";
import type {
  FmGlobalMatchResult,
  FmGlobalMatchView,
  FmGlobalRecommendation,
  FmGlobalSpecInput,
  FmGlobalSubmissionResponse,
  FmGlobalTableSummary,
  FmSprinklerConfigSummary,
} from "@/types/fm-global";

type SprinklerConfigRow = z.infer<typeof fmSprinklerConfigSchema>;
type TableRowWithFigures = z.infer<typeof fmGlobalTableSummarySchema>;

const sprinklerConfigSelect =
  "table_id,sprinkler_count,k_factor,k_factor_type,pressure_psi,pressure_bar,orientation,response_type,spacing_ft,coverage_type,temperature_rating,ceiling_height_ft,special_conditions,notes";

const tableSummarySelect =
  "id,table_id,table_number,title,asrs_type,system_type,protection_scheme,commodity_types,container_type,figures";

function pickBestConfig(
  configs: SprinklerConfigRow[],
  input: FmGlobalSpecInput,
): FmSprinklerConfigSummary {
  const height = input.ceiling_height_ft;
  const kFactor = input.k_factor;
  const sameKFactor = kFactor
    ? configs.filter((config) => config.k_factor === kFactor)
    : configs;
  const candidates = sameKFactor.length > 0 ? sameKFactor : configs;

  const best = candidates.reduce((current, next) => {
    if (!current) return next;
    const currentDelta = Math.abs((current.ceiling_height_ft ?? 0) - height);
    const nextDelta = Math.abs((next.ceiling_height_ft ?? 0) - height);
    return nextDelta < currentDelta ? next : current;
  }, candidates[0] ?? null);

  return {
    sprinkler_count: best?.sprinkler_count ?? null,
    k_factor: best?.k_factor ?? null,
    k_factor_type: best?.k_factor_type ?? null,
    pressure_psi: best?.pressure_psi ?? null,
    pressure_bar: best?.pressure_bar ?? null,
    orientation: best?.orientation ?? null,
    response_type: best?.response_type ?? null,
    spacing_ft: best?.spacing_ft ?? null,
    coverage_type: best?.coverage_type ?? null,
    temperature_rating: best?.temperature_rating ?? null,
    ceiling_height_ft: best?.ceiling_height_ft ?? null,
    special_conditions: best?.special_conditions ?? null,
    notes: best?.notes ?? null,
  };
}

function normalizeMatchResults(
  results: unknown[],
): FmGlobalMatchResult[] {
  return results.map((result) => fmGlobalMatchSchema.parse(result));
}

function normalizeRecommendations(
  recommendations: unknown[],
): FmGlobalRecommendation[] {
  return recommendations.map((recommendation) =>
    fmGlobalRecommendationSchema.parse(recommendation),
  );
}

async function fetchMatchResults(
  supabase: ReturnType<typeof createServiceClient>,
  input: FmGlobalSpecInput,
): Promise<FmGlobalMatchResult[]> {
  const { data, error } = await supabase.rpc("find_sprinkler_requirements", {
    p_asrs_type: input.asrs_type,
    p_system_type: input.system_type,
    p_ceiling_height_ft: input.ceiling_height_ft,
    p_commodity_class: input.commodity_class ?? undefined,
    p_tolerance_ft: input.tolerance_ft,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMatchResults(data ?? []);
}

async function fetchKFactorMatches(
  supabase: ReturnType<typeof createServiceClient>,
  input: FmGlobalSpecInput,
): Promise<FmGlobalMatchResult[]> {
  if (input.k_factor === undefined) {
    return [];
  }

  const { data, error } = await supabase.rpc("find_sprinkler_requirements", {
    p_asrs_type: input.asrs_type,
    p_system_type: input.system_type,
    p_ceiling_height_ft: Math.round(input.ceiling_height_ft),
    p_commodity_class: input.commodity_class ?? undefined,
    p_k_factor: input.k_factor,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeMatchResults(data ?? []);
}

async function fetchTablesAndConfigs(
  supabase: ReturnType<typeof createServiceClient>,
  tableIds: string[],
): Promise<{
  tables: FmGlobalTableSummary[];
  configs: SprinklerConfigRow[];
  tableRows: TableRowWithFigures[];
}> {
  const { data: tables, error: tableError } = await supabase
    .from("fm_global_tables")
    .select(tableSummarySelect)
    .in("table_id", tableIds);

  if (tableError) {
    throw new Error(tableError.message);
  }

  const { data: configs, error: configError } = await supabase
    .from("fm_sprinkler_configs")
    .select(sprinklerConfigSelect)
    .in("table_id", tableIds);

  if (configError) {
    throw new Error(configError.message);
  }

  const parsedTables =
    tables?.map((table) => fmGlobalTableSummarySchema.parse(table)) ?? [];

  const normalizedTables = parsedTables.map((table) => ({
    id: table.id,
    table_id: table.table_id,
    table_number: table.table_number,
    title: table.title,
    asrs_type: table.asrs_type,
    system_type: table.system_type,
    protection_scheme: table.protection_scheme,
    commodity_types: table.commodity_types,
    container_type: table.container_type,
  }));

  return {
    tables: normalizedTables,
    configs:
      configs?.map((config) => fmSprinklerConfigSchema.parse(config)) ?? [],
    tableRows: parsedTables,
  };
}

async function fetchFigures(
  supabase: ReturnType<typeof createServiceClient>,
  tables: FmGlobalTableSummary[],
  tableRows: TableRowWithFigures[],
): Promise<Map<number, Set<string>>> {
  const tableNumbers = tables.map((table) => table.table_number);
  const { figureMap, primaryFigureIds } = mapPrimaryFigures(tableRows);
  const [primaryFigures, relatedFigures] = await Promise.all([
    fetchFigureRows(supabase, primaryFigureIds),
    fetchFigureRowsByTable(supabase, tableNumbers),
  ]);

  return applyRelatedFigureMapping(
    figureMap,
    [...primaryFigures, ...relatedFigures],
  );
}

function mapPrimaryFigures(
  tableRows: TableRowWithFigures[],
): { figureMap: Map<number, Set<string>>; primaryFigureIds: string[] } {
  const figureMap = new Map<number, Set<string>>();
  const primaryFigureIds: string[] = [];

  tableRows.forEach((row) => {
    if (!row.figures) return;
    primaryFigureIds.push(row.figures);
    if (!figureMap.has(row.table_number)) {
      figureMap.set(row.table_number, new Set<string>());
    }
    figureMap.get(row.table_number)?.add(row.figures);
  });

  return { figureMap, primaryFigureIds };
}

async function fetchFigureRows(
  supabase: ReturnType<typeof createServiceClient>,
  figureIds: string[],
): Promise<unknown[]> {
  if (figureIds.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("fm_global_figures")
    .select(
      "id,figure_number,title,figure_type,image,related_tables,asrs_type,container_type",
    )
    .in("id", figureIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function fetchFigureRowsByTable(
  supabase: ReturnType<typeof createServiceClient>,
  tableNumbers: number[],
): Promise<unknown[]> {
  if (tableNumbers.length === 0) {
    return [];
  }
  const { data, error } = await supabase
    .from("fm_global_figures")
    .select(
      "id,figure_number,title,figure_type,image,related_tables,asrs_type,container_type",
    )
    .overlaps("related_tables", tableNumbers);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function applyRelatedFigureMapping(
  figureMap: Map<number, Set<string>>,
  figures: unknown[],
): Map<number, Set<string>> {
  figures.forEach((figure) => {
    const parsed = fmGlobalFigureSchema.parse(figure);
    (parsed.related_tables ?? []).forEach((tableNumber) => {
      if (!figureMap.has(tableNumber)) {
        figureMap.set(tableNumber, new Set<string>());
      }
      figureMap.get(tableNumber)?.add(parsed.id);
    });
  });

  return figureMap;
}

async function fetchFigureDetails(
  supabase: ReturnType<typeof createServiceClient>,
  figureIds: string[],
): Promise<Map<string, ReturnType<typeof fmGlobalFigureSchema.parse>>> {
  if (figureIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("fm_global_figures")
    .select(
      "id,figure_number,title,figure_type,image,related_tables,asrs_type,container_type",
    )
    .in("id", figureIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    (data ?? []).map((figure) => {
      const parsed = fmGlobalFigureSchema.parse(figure);
      return [parsed.id, parsed];
    }),
  );
}

async function fetchRecommendations(
  supabase: ReturnType<typeof createServiceClient>,
  input: FmGlobalSpecInput,
): Promise<FmGlobalRecommendation[]> {
  const { data, error } = await supabase.rpc(
    "generate_optimization_recommendations",
    {
      project_data: {
        storage_height_ft: input.storage_height_ft,
        container_type: input.container_type,
        asrs_type: input.asrs_type,
        system_type: input.system_type,
        rack_row_depth_ft: input.rack_row_depth_ft,
        commodity_class: input.commodity_class,
        building_heated: input.building_heated,
      },
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRecommendations(data ?? []);
}

async function persistSubmission(
  supabase: ReturnType<typeof createServiceClient>,
  input: FmGlobalSpecInput,
  tableIds: string[],
  recommendations: FmGlobalRecommendation[],
): Promise<string> {
  const { data, error } = await supabase
    .from("fm_form_submissions")
    .insert({
      user_input: input as unknown as Json,
      parsed_requirements: input as unknown as Json,
      matched_table_ids: tableIds,
      recommendations: recommendations as unknown as Json,
      similarity_scores: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? "";
}

function mapConfigsByTable(
  configs: SprinklerConfigRow[],
): Map<string, SprinklerConfigRow[]> {
  const configsByTable = new Map<string, SprinklerConfigRow[]>();
  configs.forEach((config) => {
    const existing = configsByTable.get(config.table_id) ?? [];
    existing.push(config);
    configsByTable.set(config.table_id, existing);
  });
  return configsByTable;
}

function mapTablesById(
  tables: FmGlobalTableSummary[],
): Map<string, FmGlobalTableSummary> {
  return new Map(tables.map((table) => [table.table_id, table]));
}

function getFallbackTable(
  match: FmGlobalMatchResult,
  input: FmGlobalSpecInput,
): FmGlobalTableSummary {
  return {
    id: "",
    table_id: match.table_id,
    table_number: match.table_number,
    title: match.title,
    asrs_type: input.asrs_type,
    system_type: input.system_type,
    protection_scheme: "",
    commodity_types: null,
    container_type: null,
  };
}

function buildMatchViews(
  matches: FmGlobalMatchResult[],
  tables: FmGlobalTableSummary[],
  configs: SprinklerConfigRow[],
  input: FmGlobalSpecInput,
  figureMap: Map<number, Set<string>>,
  figureById: Map<string, ReturnType<typeof fmGlobalFigureSchema.parse>>,
): FmGlobalMatchView[] {
  const configsByTable = mapConfigsByTable(configs);
  const tableMap = mapTablesById(tables);
  const sortedMatches = [...matches].sort((left, right) => {
    if (left.height_match_type === right.height_match_type) {
      return left.table_number - right.table_number;
    }
    return left.height_match_type === "exact" ? -1 : 1;
  });

  return sortedMatches.map((match) => {
    const table = tableMap.get(match.table_id) ?? getFallbackTable(match, input);
    const config = pickBestConfig(
      configsByTable.get(match.table_id) ?? [],
      input,
    );
    const figureIdsForTable = figureMap.get(match.table_number) ?? new Set();
    const figures = Array.from(figureIdsForTable)
      .map((id) => figureById.get(id))
      .filter((figure): figure is ReturnType<typeof fmGlobalFigureSchema.parse> =>
        Boolean(figure),
      );

    return {
      table,
      sprinkler: config,
      figures,
      height_match_type: match.height_match_type ?? null,
    };
  });
}

function mergeMatches(
  matchesByHeight: FmGlobalMatchResult[],
  matchesByKFactor: FmGlobalMatchResult[],
): FmGlobalMatchResult[] {
  const byTable = new Map<string, FmGlobalMatchResult>();
  [...matchesByHeight, ...matchesByKFactor].forEach((match) => {
    if (!byTable.has(match.table_id)) {
      byTable.set(match.table_id, match);
    }
  });
  return Array.from(byTable.values());
}

async function buildMatchViewsForInput(
  supabase: ReturnType<typeof createServiceClient>,
  input: FmGlobalSpecInput,
  matches: FmGlobalMatchResult[],
): Promise<{ tableIds: string[]; matchViews: FmGlobalMatchView[] }> {
  const tableIds = [...new Set(matches.map((match) => match.table_id))];
  if (tableIds.length === 0) {
    return { tableIds, matchViews: [] };
  }

  const { tables, configs, tableRows } = await fetchTablesAndConfigs(
    supabase,
    tableIds,
  );

  const figureMap = await fetchFigures(supabase, tables, tableRows);
  const figureIds = Array.from(
    new Set(Array.from(figureMap.values()).flatMap((set) => [...set])),
  );
  const figureById = await fetchFigureDetails(supabase, figureIds);
  const matchViews = buildMatchViews(
    matches,
    tables,
    configs,
    input,
    figureMap,
    figureById,
  );

  return { tableIds, matchViews };
}

/**
 * Submit FM Global spec inputs and return matched tables, figures, and configs.
 */
export async function submitFmGlobalSpecs(
  rawInput: FmGlobalSpecInput,
): Promise<FmGlobalSubmissionResponse> {
  const input = fmGlobalSpecInputSchema.parse(rawInput);
  const supabase = createServiceClient();

  const matchesByHeight = await fetchMatchResults(supabase, input);
  const matchesByKFactor = await fetchKFactorMatches(supabase, input);
  const matches = mergeMatches(matchesByHeight, matchesByKFactor);
  const { tableIds, matchViews } = await buildMatchViewsForInput(
    supabase,
    input,
    matches,
  );

  const recommendations = await fetchRecommendations(supabase, input);
  const submissionId = await persistSubmission(
    supabase,
    input,
    tableIds,
    recommendations,
  );

  revalidatePath("/fm-global/form");

  return {
    submissionId,
    matches: matchViews,
    recommendations,
  };
}

/**
 * Update the selected configuration for a saved submission.
 */
export async function selectFmGlobalConfiguration(
  submissionId: string,
  selectedConfiguration: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("fm_form_submissions")
    .update({
      selected_configuration: selectedConfiguration as Json,
    })
    .eq("id", submissionId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/fm-global/form");
}
