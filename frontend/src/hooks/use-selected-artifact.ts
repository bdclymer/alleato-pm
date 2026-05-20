"use client";

import { useCallback } from "react";
import useSWR from "swr";
import type { ArtifactType } from "@/lib/ai/services/workspace-artifact-service";

export interface SelectedArtifact {
  artifactId: string;
  artifactType: ArtifactType;
  title: string;
  content: Record<string, unknown>;
  version: number;
  projectId?: number;
}

const STORE_KEY = "selected-workspace-artifact";

export function useSelectedArtifact() {
  const { data, mutate } = useSWR<SelectedArtifact | null>(STORE_KEY, null, {
    fallbackData: null,
  });

  const open = useCallback(
    (artifact: SelectedArtifact) => {
      mutate(artifact, false);
    },
    [mutate],
  );

  const close = useCallback(() => {
    mutate(null, false);
  }, [mutate]);

  return { artifact: data ?? null, open, close };
}
