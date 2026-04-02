"use client";

/**
 * UnifiedFeedbackWidget — Renders the Agentation annotation toolbar for
 * local development. Annotations are stored client-side (localStorage) and
 * picked up by the agentation-watch MCP skill.
 *
 * IMPORTANT: This widget does NOT sync to the admin feedback backend or
 * create GitHub issues. That pipeline is reserved for the client-facing
 * feedback form on the production site.
 */

import { Agentation } from "agentation";

const MCP_ENDPOINT = "http://localhost:4747";

export function UnifiedFeedbackWidget() {
  return <Agentation endpoint={MCP_ENDPOINT} />;
}
