"use client";

import type { ReactElement } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import type { FmGlobalMatchView, FmGlobalSubmissionResponse } from "@/types/fm-global";

interface FmGlobalResultsProps {
  results: FmGlobalSubmissionResponse | null;
  submissionId: string;
  onSelectConfiguration: (
    submissionId: string,
    selection: Record<string, unknown>,
  ) => Promise<void>;
}

function formatValue(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function renderHeightMatchLabel(heightMatchType: string | null): ReactElement {
  if (heightMatchType === "exact") {
    return <Badge variant="default">Exact Height Match</Badge>;
  }
  if (heightMatchType) {
    return <Badge variant="secondary">Interpolated Height Match</Badge>;
  }
  return <Badge variant="outline">Height Match Unknown</Badge>;
}

function renderSpecialConditions(conditions: string[] | null): ReactElement {
  if (!conditions || conditions.length === 0) {
    return <Text size="sm">None</Text>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {conditions.map((condition) => (
        <Badge key={condition} variant="outline">
          {condition}
        </Badge>
      ))}
    </div>
  );
}

function buildSelectionPayload(
  match: FmGlobalMatchView,
): Record<string, unknown> {
  return {
    table_id: match.table.table_id,
    table_number: match.table.table_number,
    title: match.table.title,
    sprinkler_count: match.sprinkler.sprinkler_count,
    k_factor: match.sprinkler.k_factor,
    pressure_psi: match.sprinkler.pressure_psi,
    pressure_bar: match.sprinkler.pressure_bar,
    orientation: match.sprinkler.orientation,
    response_type: match.sprinkler.response_type,
    spacing_ft: match.sprinkler.spacing_ft,
    coverage_type: match.sprinkler.coverage_type,
    temperature_rating: match.sprinkler.temperature_rating,
    ceiling_height_ft: match.sprinkler.ceiling_height_ft,
    selected_at: new Date().toISOString(),
  };
}

function ResultsEmptyState({
  message,
}: {
  message: string;
}): ReactElement {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function SprinklerDetails({ match }: { match: FmGlobalMatchView }): ReactElement {
  const details = [
    { label: "Sprinkler Count", value: match.sprinkler.sprinkler_count },
    { label: "K-Factor", value: match.sprinkler.k_factor },
    { label: "Pressure (PSI)", value: match.sprinkler.pressure_psi },
    { label: "Pressure (bar)", value: match.sprinkler.pressure_bar },
    { label: "Orientation", value: match.sprinkler.orientation },
    { label: "Response Type", value: match.sprinkler.response_type },
    { label: "Spacing (ft)", value: match.sprinkler.spacing_ft },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {details.map((detail) => (
        <div key={detail.label}>
          <Text size="sm" tone="muted">
            {detail.label}
          </Text>
          <Text>{formatValue(detail.value)}</Text>
        </div>
      ))}
    </div>
  );
}

function FigureGrid({ match }: { match: FmGlobalMatchView }): ReactElement | null {
  if (match.figures.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Text size="sm" tone="muted">
        Relevant Figures
      </Text>
      <div className="grid gap-3 md:grid-cols-2">
        {match.figures.map((figure) => (
          <div
            key={figure.id}
            className="rounded-lg border border-border/70 p-3"
          >
            <Text className="font-medium">
              Figure {figure.figure_number}: {figure.title}
            </Text>
            <Text size="sm" tone="muted">
              {figure.figure_type}
            </Text>
            {figure.image && (
              <div className="mt-3 overflow-hidden rounded-md border">
                <Image
                  src={figure.image}
                  alt={figure.title}
                  width={400}
                  height={260}
                  className="h-auto w-full object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  submissionId,
  onSelectConfiguration,
}: {
  match: FmGlobalMatchView;
  submissionId: string;
  onSelectConfiguration: (
    submissionId: string,
    selection: Record<string, unknown>,
  ) => Promise<void>;
}): ReactElement {
  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Table {match.table.table_number}</Badge>
          {renderHeightMatchLabel(match.height_match_type)}
        </div>
        <CardTitle className="text-lg">{match.table.title}</CardTitle>
        <Text size="sm" tone="muted">
          {match.table.asrs_type} • {match.table.system_type} •{" "}
          {match.table.protection_scheme}
        </Text>
      </CardHeader>
      <CardContent className="space-y-4">
        <SprinklerDetails match={match} />
        <div className="space-y-2">
          <Text size="sm" tone="muted">
            Special Conditions
          </Text>
          {renderSpecialConditions(match.sprinkler.special_conditions)}
        </div>
        <FigureGrid match={match} />

        <Button
          variant="outline"
          onClick={() =>
            void onSelectConfiguration(submissionId, buildSelectionPayload(match))
          }
        >
          Select This Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

function RecommendationsCard({
  recommendations,
}: {
  recommendations: FmGlobalSubmissionResponse["recommendations"];
}): ReactElement {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Optimization Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={`${rec.recommendation}-${rec.priority}`}
            className="rounded-lg border border-border/70 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{rec.priority}</Badge>
              <Text size="sm" tone="muted">
                {rec.implementation_effort} effort
              </Text>
            </div>
            <Text className="mt-2">{rec.recommendation}</Text>
            {rec.savings_potential !== null && (
              <Text size="sm" tone="muted" className="mt-1">
                Estimated savings: ${rec.savings_potential}
              </Text>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * FM Global results panel for matched tables and figures.
 */
export function FmGlobalResults({
  results,
  submissionId,
  onSelectConfiguration,
}: FmGlobalResultsProps): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!results && (
          <ResultsEmptyState message="Run a match to see FM Global table and sprinkler configuration recommendations." />
        )}

        {results?.matches.length === 0 && (
          <ResultsEmptyState message="No exact match found. Try adjusting ceiling height or tolerance." />
        )}

        {results?.matches.map((match) => (
          <MatchCard
            key={match.table.table_id}
            match={match}
            submissionId={submissionId}
            onSelectConfiguration={onSelectConfiguration}
          />
        ))}

        {results?.recommendations.length ? (
          <RecommendationsCard recommendations={results.recommendations} />
        ) : null}
      </CardContent>
    </Card>
  );
}
