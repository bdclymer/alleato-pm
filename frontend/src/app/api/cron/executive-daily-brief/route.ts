export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { sendApprovedExecutiveBriefingToTeams } from "@/lib/executive/executive-briefing-teams-delivery";

function parseBearerToken(header: string | null): string | null {
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
}

export const POST = withApiGuardrails(
  "/api/cron/executive-daily-brief#POST",
  async ({ request }) => {
    const expectedSecret = process.env.CRON_SECRET;
    const token = parseBearerToken(request.headers.get("authorization"));

    if (!expectedSecret || token !== expectedSecret) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "/api/cron/executive-daily-brief#POST",
        message: "Unauthorized cron invocation.",
        status: 401,
        severity: "medium",
      });
    }

    const result = await sendApprovedExecutiveBriefingToTeams();
    return NextResponse.json(result, {
      status: result.status === "blocked" ? 400 : 200,
    });
  },
);

export const GET = POST;
