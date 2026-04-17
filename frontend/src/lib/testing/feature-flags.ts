const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

/** Parses a string env value into a boolean feature flag with a fallback default. */
function parseBooleanFlag(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

/** Shared testing feature flags so UI and API routes stay behaviorally aligned. */
export const testingFeatureFlags = Object.freeze({
  scenarioDepthFilterEnabled: parseBooleanFlag(
    process.env.TESTING_SCENARIO_DEPTH_FILTER_ENABLED ??
      process.env.NEXT_PUBLIC_TESTING_SCENARIO_DEPTH_FILTER_ENABLED,
    false,
  ),
});
