import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/permissions-guard";

interface RouteParams {
  params: { projectId: string; primeCoId: string };
}

const RELATED_ITEM_TYPES = [
  "change_event",
  "drawing",
  "rfi",
  "specification",
  "submittal",
  "commitment_co",
  "commitment",
] as const;

type RelatedItemType = (typeof RELATED_ITEM_TYPES)[number];

function isSupportedRelatedType(value: string): value is RelatedItemType {
  return (RELATED_ITEM_TYPES as readonly string[]).includes(value);
}

interface RelatedSourceRecord {
  relatedNumber: string | null;
  relatedTitle: string;
  relatedStatus: string | null;
}

async function getRelatedSourceRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: number,
  relatedType: RelatedItemType,
  relatedId: string,
): Promise<RelatedSourceRecord | null> {
  switch (relatedType) {
    case "change_event": {
      const { data, error } = await supabase
        .from("change_events")
        .select("id, number, title, status, deleted_at")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .is("deleted_at", null)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.number,
        relatedTitle: data.title,
        relatedStatus: data.status,
      };
    }

    case "rfi": {
      const { data, error } = await supabase
        .from("rfis")
        .select("id, number, subject, status")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: String(data.number),
        relatedTitle: data.subject,
        relatedStatus: data.status,
      };
    }

    case "submittal": {
      const { data, error } = await supabase
        .from("submittals")
        .select("id, submittal_number, title, status, deleted_at")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .is("deleted_at", null)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.submittal_number,
        relatedTitle: data.title,
        relatedStatus: data.status,
      };
    }

    case "drawing": {
      const { data, error } = await supabase
        .from("drawings")
        .select("id, drawing_number, title")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.drawing_number,
        relatedTitle: data.title,
        relatedStatus: null,
      };
    }

    case "specification": {
      const { data, error } = await supabase
        .from("specifications")
        .select("id, section_number, section_title, status")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.section_number,
        relatedTitle: data.section_title,
        relatedStatus: data.status,
      };
    }

    case "commitment_co": {
      const { data, error } = await supabase
        .from("commitment_pcos")
        .select("id, pco_number, title, status")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.pco_number ?? null,
        relatedTitle: data.title,
        relatedStatus: data.status,
      };
    }

    case "commitment": {
      const { data, error } = await supabase
        .from("commitments_unified")
        .select("id, contract_number, title, status")
        .eq("project_id", projectId)
        .eq("id", relatedId)
        .single();

      if (error || !data) return null;
      return {
        relatedNumber: data.contract_number ?? null,
        relatedTitle: data.title ?? "",
        relatedStatus: data.status ?? null,
      };
    }

    default:
      return null;
  }
}

export const GET = withApiGuardrails(
  "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items#GET",
  async ({ params }: RouteParams) => {
    const { projectId, primeCoId } = params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    const parsedPrimeCoId = Number.parseInt(primeCoId, 10);

    if (Number.isNaN(parsedProjectId) || Number.isNaN(parsedPrimeCoId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    throw new GuardrailError({
      code: "SCHEMA_MISMATCH",
      where: "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items#GET",
      message:
        "Prime contract change order related items are unavailable because prime_contract_change_order_related_items is not present in the live Supabase schema.",
    });
  },
);

export const POST = withApiGuardrails(
  "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items#POST",
  async ({ request, params }) => {
    const { projectId, primeCoId } = params;
    const parsedProjectId = Number.parseInt(projectId, 10);
    const parsedPrimeCoId = Number.parseInt(primeCoId, 10);

    if (Number.isNaN(parsedProjectId) || Number.isNaN(parsedPrimeCoId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const guard = await requirePermission(parsedProjectId, "change_orders", "write");
    if (guard.denied) return guard.response;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new GuardrailError({
        code: "AUTH_EXPIRED",
        where: "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items#POST",
        message: "Authentication required.",
      });
    }

    const body = (await request.json()) as {
      relatedType?: string;
      relatedId?: string;
    };

    const relatedType = body.relatedType?.trim().toLowerCase();
    const relatedId = body.relatedId?.trim();

    if (!relatedType || !isSupportedRelatedType(relatedType)) {
      return NextResponse.json({ error: "Invalid related item type" }, { status: 400 });
    }

    if (!relatedId) {
      return NextResponse.json({ error: "Related item id is required" }, { status: 400 });
    }

    const { data: parentCo, error: parentError } = await supabase
      .from("prime_contract_change_orders")
      .select("id")
      .eq("id", parsedPrimeCoId)
      .eq("project_id", parsedProjectId)
      .single();

    if (parentError || !parentCo) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    const sourceRecord = await getRelatedSourceRecord(
      supabase,
      parsedProjectId,
      relatedType,
      relatedId,
    );

    if (!sourceRecord) {
      return NextResponse.json(
        { error: "Related record not found for this project" },
        { status: 404 },
      );
    }

    throw new GuardrailError({
      code: "SCHEMA_MISMATCH",
      where: "projects/[projectId]/prime-contract-change-orders/[primeCoId]/related-items#POST",
      message:
        "Cannot link related items because prime_contract_change_order_related_items is not present in the live Supabase schema.",
    });
  },
);
