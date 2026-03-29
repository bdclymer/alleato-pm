"use client";

import type { ReactElement } from "react";
import { useState, useTransition } from "react";
import { submitFmGlobalSpecs, selectFmGlobalConfiguration } from "./actions";
import type {
  FmGlobalSpecInput,
  FmGlobalSubmissionResponse,
  FmGlobalSubmissionSummary,
} from "@/types/fm-global";
import { FmGlobalForm, defaultFormState, type FormState } from "./fm-global-form";
import { FmGlobalResults } from "./fm-global-results";
import { FmGlobalSubmissions } from "./fm-global-submissions";

interface FmGlobalClientProps {
  initialSubmissions: FmGlobalSubmissionSummary[];
}

interface FmGlobalState {
  formState: FormState;
  setFormState: (state: FormState) => void;
  results: FmGlobalSubmissionResponse | null;
  setResults: (response: FmGlobalSubmissionResponse | null) => void;
  errorMessage: string | null;
  setErrorMessage: (message: string | null) => void;
  submissions: FmGlobalSubmissionSummary[];
  setSubmissions: (
    updater: (current: FmGlobalSubmissionSummary[]) => FmGlobalSubmissionSummary[],
  ) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
}

function buildSubmissionSummary(
  response: FmGlobalSubmissionResponse,
  input: FmGlobalSpecInput,
): FmGlobalSubmissionSummary {
  return {
    id: response.submissionId,
    created_at: new Date().toISOString(),
    user_input: input,
    matched_table_ids: response.matches.map((match) => match.table.table_id),
    selected_configuration: null,
  };
}

function toFormState(
  submission: FmGlobalSubmissionSummary,
): FormState | null {
  if (!submission.user_input) {
    return null;
  }
  return {
    asrsType: submission.user_input.asrs_type,
    systemType: submission.user_input.system_type,
    ceilingHeight: submission.user_input.ceiling_height_ft.toString(),
    commodityClass: submission.user_input.commodity_class ?? "",
    kFactor: submission.user_input.k_factor?.toString() ?? "",
    tolerance: submission.user_input.tolerance_ft?.toString() ?? "5",
    containerType: submission.user_input.container_type ?? "unspecified",
    storageHeight: submission.user_input.storage_height_ft?.toString() ?? "",
    rackRowDepth: submission.user_input.rack_row_depth_ft?.toString() ?? "",
    buildingHeated: submission.user_input.building_heated ?? false,
  };
}

function toNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildInput(state: FormState): FmGlobalSpecInput | null {
  const ceiling = toNumber(state.ceilingHeight);
  if (!ceiling) return null;

  return {
    asrs_type: state.asrsType as FmGlobalSpecInput["asrs_type"],
    system_type: state.systemType as FmGlobalSpecInput["system_type"],
    ceiling_height_ft: ceiling,
    commodity_class: state.commodityClass || undefined,
    k_factor: toNumber(state.kFactor),
    tolerance_ft: toNumber(state.tolerance) ?? 5,
    container_type:
      state.containerType && state.containerType !== "unspecified"
        ? (state.containerType as FmGlobalSpecInput["container_type"])
      : undefined,
    storage_height_ft: toNumber(state.storageHeight),
    rack_row_depth_ft: toNumber(state.rackRowDepth),
    building_heated: state.buildingHeated,
  };
}

function useFmGlobalState(
  initialSubmissions: FmGlobalSubmissionSummary[],
): FmGlobalState {
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [results, setResults] = useState<FmGlobalSubmissionResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissions, setSubmissions] =
    useState<FmGlobalSubmissionSummary[]>(initialSubmissions);
  const [isPending, startTransition] = useTransition();

  return {
    formState,
    setFormState,
    results,
    setResults,
    errorMessage,
    setErrorMessage,
    submissions,
    setSubmissions,
    isPending,
    startTransition,
  };
}

function createSubmitHandler({
  formState,
  setResults,
  setErrorMessage,
  setSubmissions,
  startTransition,
}: {
  formState: FormState;
  setResults: (response: FmGlobalSubmissionResponse | null) => void;
  setErrorMessage: (message: string | null) => void;
  setSubmissions: (
    updater: (current: FmGlobalSubmissionSummary[]) => FmGlobalSubmissionSummary[],
  ) => void;
  startTransition: (callback: () => void) => void;
}): () => void {
  return () => {
    setErrorMessage(null);
    const input = buildInput(formState);
    if (!input) {
      setErrorMessage("Ceiling height is required.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await submitFmGlobalSpecs(input);
          setResults(response);
          setSubmissions((current) => [
            buildSubmissionSummary(response, input),
            ...current,
          ]);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load FM Global matches.",
          );
        }
      })();
    });
  };
}

function createLoadHandler({
  setFormState,
  setResults,
}: {
  setFormState: (state: FormState) => void;
  setResults: (response: FmGlobalSubmissionResponse | null) => void;
}): (submission: FmGlobalSubmissionSummary) => void {
  return (submission: FmGlobalSubmissionSummary) => {
    const nextState = toFormState(submission);
    if (!nextState) return;
    setFormState(nextState);
    setResults(null);
  };
}

function createSelectHandler(
  setSubmissions: (
    updater: (current: FmGlobalSubmissionSummary[]) => FmGlobalSubmissionSummary[],
  ) => void,
  setErrorMessage: (message: string | null) => void,
): (
  submissionId: string,
  selection: Record<string, unknown>,
) => Promise<void> {
  return async (submissionId: string, selection: Record<string, unknown>) => {
    try {
      await selectFmGlobalConfiguration(submissionId, selection);
      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === submissionId
            ? { ...submission, selected_configuration: selection }
            : submission,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save the selected configuration.",
      );
    }
  };
}

/**
 * Client container for FM Global spec entry and matching.
 */
export function FmGlobalClient({
  initialSubmissions,
}: FmGlobalClientProps): ReactElement {
  const {
    formState,
    setFormState,
    results,
    setResults,
    errorMessage,
    setErrorMessage,
    submissions,
    setSubmissions,
    isPending,
    startTransition,
  } = useFmGlobalState(initialSubmissions);

  const submit = createSubmitHandler({
    formState,
    setResults,
    setErrorMessage,
    setSubmissions,
    startTransition,
  });
  const loadSubmission = createLoadHandler({ setFormState, setResults });
  const selectConfiguration = createSelectHandler(
    setSubmissions,
    setErrorMessage,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-6">
        <FmGlobalForm
          formState={formState}
          onFormChange={setFormState}
          onSubmit={submit}
          isPending={isPending}
          errorMessage={errorMessage}
        />
        <FmGlobalResults
          results={results}
          submissionId={results?.submissionId ?? ""}
          onSelectConfiguration={selectConfiguration}
        />
      </div>
      <FmGlobalSubmissions
        submissions={submissions}
        onLoadSubmission={loadSubmission}
      />
    </div>
  );
}
