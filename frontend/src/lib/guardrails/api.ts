import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getErrorCatalogEntry } from "@/lib/guardrails/error-catalog";
import { asGuardrailError, GuardrailError } from "@/lib/guardrails/errors";
import { validateEnvVars } from "@/lib/guardrails/env";
import { getOrCreateRequestId, logEvent, notifyOnError } from "@/lib/guardrails/observability";

export interface ErrorEnvelope {
  success: false;
  error_code: string;
  error_message: string;
  where_it_failed: string;
  request_id: string;
  timestamp: string;
  details?: unknown;
}

type UnwrapParams<TParams> = TParams extends Promise<infer TUnwrapped>
  ? TUnwrapped
  : TParams;

interface HandlerContext<TParams = any> {
  request: NextRequest;
  params: TParams;
  requestId: string;
}

type WrappedHandler<TParams = any> = (
  context: HandlerContext<TParams>,
) => Promise<Response>;

let runtimeEnvValidated = false;

function ensureRuntimeEnv(where: string): void {
  if (runtimeEnvValidated) return;
  validateEnvVars(where, [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ], {
    urlVars: ["NEXT_PUBLIC_SUPABASE_URL", "BACKEND_URL", "PYTHON_BACKEND_URL"],
  });
  runtimeEnvValidated = true;
}

function errorEnvelopeFrom(
  error: GuardrailError,
  requestId: string,
): ErrorEnvelope {
  return {
    success: false,
    error_code: error.code,
    error_message: error.message,
    where_it_failed: error.where,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    ...(typeof error.details === "undefined" ? {} : { details: error.details }),
  };
}

export function withApiGuardrails<TParams = any>(
  where: string,
  handler: WrappedHandler<UnwrapParams<TParams>>,
) {
  return async (
    request: NextRequest,
    args: { params: Promise<UnwrapParams<TParams>> },
  ): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = getOrCreateRequestId(request.headers);

    try {
      ensureRuntimeEnv(where);

      logEvent({
        event: "api_request_started",
        requestId,
        where,
        details: {
          method: request.method,
          path: request.nextUrl.pathname,
        },
      });

      const response = await handler({
        request,
        params: args?.params
          ? await args.params
          : ({} as UnwrapParams<TParams>),
        requestId,
      });

      const durationMs = Date.now() - startedAt;
      logEvent({
        event: "api_request_succeeded",
        requestId,
        where,
        durationMs,
        details: {
          status: response.status,
        },
      });

      response.headers.set("x-request-id", requestId);
      return response;
    } catch (rawError) {
      const durationMs = Date.now() - startedAt;
      const error = asGuardrailError(rawError, {
        code: "INTERNAL_ERROR",
        where,
      });
      const catalog = getErrorCatalogEntry(error.code);

      logEvent({
        event: "api_request_failed",
        level: "error",
        requestId,
        where,
        durationMs,
        details: {
          error_code: error.code,
          status: error.status,
          reason: error.message,
          retryable: error.safeToRetry,
        },
      });

      await notifyOnError({
        severity: error.severity ?? catalog.alertSeverity,
        requestId,
        where,
        errorCode: error.code,
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      });

      const envelope = errorEnvelopeFrom(error, requestId);
      return NextResponse.json(envelope, {
        status: error.status ?? catalog.httpStatus,
        headers: {
          "x-request-id": requestId,
        },
      });
    }
  };
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  where: string,
): Promise<T> {
  const body = await request.json().catch(() => {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      message: "Malformed JSON payload.",
    });
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new GuardrailError({
      code: "INVALID_PAYLOAD",
      where,
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}

export function validateResponseContract<T>(
  schema: z.ZodType<T>,
  data: unknown,
  where: string,
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new GuardrailError({
      code: "SCHEMA_MISMATCH",
      where,
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  return parsed.data;
}
