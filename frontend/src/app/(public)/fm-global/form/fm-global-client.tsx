"use client";

import type { ReactElement } from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  submitFmGlobalSpecs,
  type FmPublicSubmissionMetadata,
} from "./actions";
import type { FmGlobalSpecInput } from "@/types/fm-global";
import {
  FmGlobalForm,
  defaultFormState,
  CONTAINER_TYPE_OTHER,
  type FormState,
} from "./fm-global-form";

function toNumber(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ValidatedPayload {
  input: FmGlobalSpecInput;
  metadata: FmPublicSubmissionMetadata;
}

function buildPayload(state: FormState): ValidatedPayload | string {
  const name = state.contactName.trim();
  const email = state.contactEmail.trim();
  const projectName = state.projectName.trim();
  const projectLocation = state.projectLocation.trim();

  if (!name) return "Please add your name.";
  if (!email) return "Please add your email.";
  if (!EMAIL_PATTERN.test(email)) {
    return "Please enter a valid email address.";
  }
  if (!projectName) return "Please add a project name.";

  const ceiling = toNumber(state.ceilingHeight);
  if (!ceiling) return "Ceiling height is required.";

  const kFactor = toNumber(state.kFactor);
  if (kFactor === undefined) {
    return "Please select the existing ceiling sprinkler K-factor.";
  }

  let containerType: string | undefined;
  if (state.containerType === CONTAINER_TYPE_OTHER) {
    const other = state.containerTypeOther.trim();
    if (!other) return "Please describe the container type.";
    containerType = other;
  } else if (state.containerType && state.containerType !== "unspecified") {
    containerType = state.containerType;
  }

  const input: FmGlobalSpecInput = {
    asrs_type: state.asrsType as FmGlobalSpecInput["asrs_type"],
    system_type: "wet",
    ceiling_height_ft: ceiling,
    commodity_class: state.commodityClass || undefined,
    k_factor: kFactor,
    tolerance_ft: 5,
    container_type: containerType,
    storage_height_ft: toNumber(state.storageHeight),
    rack_row_depth_ft: toNumber(state.rackRowDepth),
    building_heated: true,
  };

  const metadata: FmPublicSubmissionMetadata = {
    contact_name: name,
    contact_email: email,
    project_name: projectName,
    project_location: projectLocation || undefined,
  };

  return { input, metadata };
}

/**
 * Public client wrapper for the FM Global ASRS sprinkler form. Submits to the
 * server action and redirects to a confirmation page.
 */
export function FmGlobalClient(): ReactElement {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setErrorMessage(null);
    const result = buildPayload(formState);
    if (typeof result === "string") {
      setErrorMessage(result);
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await submitFmGlobalSpecs(
            result.input,
            result.metadata,
          );
          router.push(`/fm-global/form/submitted/${response.submissionId}`);
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to submit your requirements. Please try again.",
          );
        }
      })();
    });
  };

  return (
    <FmGlobalForm
      formState={formState}
      onFormChange={setFormState}
      onSubmit={submit}
      isPending={isPending}
      errorMessage={errorMessage}
    />
  );
}
