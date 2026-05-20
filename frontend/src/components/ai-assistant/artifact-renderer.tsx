"use client";

import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { useSelectedArtifact } from "@/hooks/use-selected-artifact";
import type { ArtifactType } from "@/lib/ai/services/workspace-artifact-service";
import { Expand } from "lucide-react";
import { ArtifactBody } from "./artifact-body";

interface SaveArtifactInput {
  artifactId?: string;
  artifactType: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  projectId?: number;
  status?: string;
}

interface SaveArtifactOutput {
  saved: boolean;
  artifactId: string;
  version: number;
  action: "created" | "updated";
}

interface ArtifactToolPart {
  type: string;
  toolCallId: string;
  input: unknown;
  output?: unknown;
  state: string;
}

interface ArtifactRendererProps {
  part: ArtifactToolPart;
}

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  owner_update: "Owner Update",
  risk_report: "Risk Report",
  meeting_prep: "Meeting Prep",
  analysis: "Analysis",
  briefing: "Briefing",
  note: "Note",
};

function isSaveArtifactInput(value: unknown): value is SaveArtifactInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.artifactType === "string" &&
    typeof v.title === "string" &&
    typeof v.content === "object" &&
    v.content !== null
  );
}

function isSaveArtifactOutput(value: unknown): value is SaveArtifactOutput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.artifactId === "string" && typeof v.saved === "boolean";
}

export function ArtifactRenderer({ part }: ArtifactRendererProps) {
  const { open } = useSelectedArtifact();

  if (!isSaveArtifactInput(part.input)) return null;

  const { artifactType, title, content, projectId } = part.input;
  const output = isSaveArtifactOutput(part.output) ? part.output : null;
  const isStreaming = part.state !== "output-available" && part.state !== "output-error";

  const handleExpand = () => {
    if (!output) return;
    open({
      artifactId: output.artifactId,
      artifactType,
      title,
      content,
      version: output.version,
      projectId,
    });
  };

  return (
    <Artifact className="mb-3 max-w-full">
      <ArtifactHeader>
        <div className="min-w-0 flex-1">
          <ArtifactTitle className="truncate">{title}</ArtifactTitle>
          <ArtifactDescription className="text-xs">
            {ARTIFACT_TYPE_LABELS[artifactType] ?? artifactType}
            {output?.version ? ` · v${output.version}` : ""}
            {output?.action === "updated" ? " · updated" : ""}
          </ArtifactDescription>
        </div>
        <ArtifactActions>
          <ArtifactAction
            icon={Expand}
            tooltip="Open in side panel"
            onClick={handleExpand}
            disabled={!output || isStreaming}
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="max-h-96">
        {isStreaming ? (
          <p className="text-sm text-muted-foreground">Drafting…</p>
        ) : (
          <ArtifactBody
            artifactType={artifactType}
            content={content}
            variant="preview"
          />
        )}
      </ArtifactContent>
    </Artifact>
  );
}
