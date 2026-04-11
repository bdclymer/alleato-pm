export type AlertSeverity = "critical" | "high" | "medium" | "low";

export interface ErrorCatalogEntry {
  code: string;
  humanMessage: string;
  typicalCause: string;
  preventionRule: string;
  alertSeverity: AlertSeverity;
  httpStatus: number;
  safeToRetry: boolean;
}

export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  AUTH_EXPIRED: {
    code: "AUTH_EXPIRED",
    humanMessage: "Authentication expired. Sign in again and retry.",
    typicalCause: "Session token is missing, invalid, or expired.",
    preventionRule: "Validate auth at route entry and refresh tokens before expiry.",
    alertSeverity: "medium",
    httpStatus: 401,
    safeToRetry: true,
  },
  MISSING_ENV_VAR: {
    code: "MISSING_ENV_VAR",
    humanMessage: "Service configuration is incomplete.",
    typicalCause: "Required environment variable is not set at runtime.",
    preventionRule: "Run startup env validation and block boot on missing vars.",
    alertSeverity: "high",
    httpStatus: 500,
    safeToRetry: false,
  },
  INVALID_PAYLOAD: {
    code: "INVALID_PAYLOAD",
    humanMessage: "Request payload is invalid.",
    typicalCause: "Input failed required field, type, range, or enum validation.",
    preventionRule: "Apply schema validation at every API entry point.",
    alertSeverity: "low",
    httpStatus: 400,
    safeToRetry: false,
  },
  UPSTREAM_TIMEOUT: {
    code: "UPSTREAM_TIMEOUT",
    humanMessage: "Upstream service timed out.",
    typicalCause: "External service did not respond within timeout.",
    preventionRule: "Use timeout + retry + backoff wrapper for all outbound calls.",
    alertSeverity: "high",
    httpStatus: 504,
    safeToRetry: true,
  },
  UPSTREAM_FAILURE: {
    code: "UPSTREAM_FAILURE",
    humanMessage: "Upstream dependency failed.",
    typicalCause: "Third-party API returned a server error or unexpected payload.",
    preventionRule: "Normalize third-party failures and add contract checks.",
    alertSeverity: "high",
    httpStatus: 502,
    safeToRetry: true,
  },
  SCHEMA_MISMATCH: {
    code: "SCHEMA_MISMATCH",
    humanMessage: "Schema or contract mismatch detected.",
    typicalCause: "Response contract changed or DB schema differs from expected types.",
    preventionRule: "Run contract tests and schema validation in quality gate.",
    alertSeverity: "critical",
    httpStatus: 500,
    safeToRetry: false,
  },
  ROUTE_BINDING_MISSING: {
    code: "ROUTE_BINDING_MISSING",
    humanMessage: "Endpoint route binding is missing.",
    typicalCause: "Route file/path naming conflict or route was removed.",
    preventionRule: "Run route audit and smoke tests on deploy.",
    alertSeverity: "high",
    httpStatus: 404,
    safeToRetry: false,
  },
  DB_MIGRATION_MISMATCH: {
    code: "DB_MIGRATION_MISMATCH",
    humanMessage: "Database migration mismatch detected.",
    typicalCause: "App expects columns/tables not applied in current environment.",
    preventionRule: "Validate migrations in pre-deploy and block release on mismatch.",
    alertSeverity: "critical",
    httpStatus: 500,
    safeToRetry: false,
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    humanMessage: "Unexpected server error.",
    typicalCause: "Unhandled exception in route, job, or workflow step.",
    preventionRule: "Wrap handlers in universal error guardrail wrapper.",
    alertSeverity: "high",
    httpStatus: 500,
    safeToRetry: false,
  },
};

export function getErrorCatalogEntry(code: string): ErrorCatalogEntry {
  return ERROR_CATALOG[code] ?? ERROR_CATALOG.INTERNAL_ERROR;
}

