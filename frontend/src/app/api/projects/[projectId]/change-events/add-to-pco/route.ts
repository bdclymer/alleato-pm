/**
 * POST /api/projects/[projectId]/change-events/add-to-pco
 *
 * Creates a Potential Change Order (PCO) for each selected change event and
 * links them via change_event_related_items.
 *
 * Optionally accepts an existing pcoId to link CEs to an existing PCO instead
 * of creating new ones.
 *
 * Body (create new):  { changeEventIds: string[], contractId: string }
 * Body (link existing): { changeEventIds: string[], pcoId: number }
 * Returns: { created: number, pcos: { changeEventId: string, pcoId: number }[] }
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const bodySchema = z.union([
  // Create new PCOs — requires a prime contract to associate the PCOs with
  z.object({
    changeEventIds: z.array(z.string().uuid()).min(1),
    contractId: z.string().uuid(),
    pcoId: z.undefined().optional(),
  }),
  // Link to an existing PCO
  z.object({
    changeEventIds: z.array(z.string().uuid()).min(1),
    pcoId: z.number().int().positive(),
    contractId: z.undefined().optional(),
  }),
]);

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    if (Number.isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const rawBody = await request.json();
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { changeEventIds } = parsed.data;
    const supabase = await createClient();

    // Fetch the selected change events (with line items) so we can compute totals
    // and use their titles/descriptions in PCOs.
    const { data: changeEvents, error: fetchError } = await supabase
      .from("change_events")
      .select("id, number, title, description, change_event_line_items(*)")
      .in("id", changeEventIds)
      .eq("project_id", projectId)
      .is("deleted_at", null);

    if (fetchError) {
      return apiErrorResponse(fetchError);
    }

    if (!changeEvents || changeEvents.length === 0) {
      return NextResponse.json(
        { error: "No matching change events found" },
        { status: 404 },
      );
    }

    // ── Link to an existing PCO ──────────────────────────────────────────
    if ("pcoId" in parsed.data && parsed.data.pcoId) {
      const existingPcoId = parsed.data.pcoId;

      // Verify the PCO exists in this project
      const { data: existingPco, error: pcoErr } = await supabase
        .from("potential_change_orders")
        .select("id, number, title, status")
        .eq("id", existingPcoId)
        .eq("project_id", projectId)
        .single();

      if (pcoErr || !existingPco) {
        return NextResponse.json(
          { error: "PCO not found or does not belong to this project" },
          { status: 404 },
        );
      }

      const linked: { changeEventId: string; pcoId: number }[] = [];
      const errors: string[] = [];

      for (const event of changeEvents) {
        const { error: linkError } = await supabase
          .from("change_event_related_items")
          .insert({
            change_event_id: event.id,
            project_id: projectId,
            related_id: String(existingPco.id),
            related_type: "potential_change_order",
            related_number: existingPco.number,
            related_title: existingPco.title,
            related_status: existingPco.status,
          });

        if (linkError) {
          errors.push(
            `Failed to link CE ${event.id} to PCO ${existingPco.id}: ${linkError.message}`,
          );
          continue;
        }

        linked.push({ changeEventId: event.id, pcoId: existingPco.id });
      }

      if (linked.length === 0) {
        return NextResponse.json(
          { error: "Failed to link any change events", details: errors },
          { status: 500 },
        );
      }

      return NextResponse.json({
        created: linked.length,
        pcos: linked,
        ...(errors.length > 0 ? { warnings: errors } : {}),
      });
    }

    // ── Create new PCOs ──────────────────────────────────────────────────
    const contractId = (parsed.data as { contractId: string }).contractId;

    // Resolve the prime contract so we know it's valid for this project
    const { data: primeContract, error: contractError } = await supabase
      .from("prime_contracts")
      .select("id, contract_number")
      .eq("id", contractId)
      .eq("project_id", projectId)
      .single();

    if (contractError || !primeContract) {
      return NextResponse.json(
        { error: "Prime contract not found or does not belong to this project" },
        { status: 404 },
      );
    }

    // Seed PCO numbering from the highest existing number in this project.
    const { data: existingPCOs } = await supabase
      .from("potential_change_orders")
      .select("number")
      .eq("project_id", projectId);

    let pcoSeed = 0;
    for (const row of existingPCOs ?? []) {
      const m = String(row?.number ?? "").match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > pcoSeed) pcoSeed = n;
      }
    }

    const pcos: { changeEventId: string; pcoId: number }[] = [];
    const errors: string[] = [];

    for (const event of changeEvents) {
      const pcoTitle = event.title
        ? `PCO for CE #${event.number ?? event.id} — ${event.title}`
        : `PCO for CE #${event.number ?? event.id}`;

      // Compute estimated_value from change event line items (revenue_rom preferred)
      const lineItems = (event as any).change_event_line_items || [];
      const estimatedValue = lineItems.reduce(
        (sum: number, item: any) =>
          sum + (Number(item.revenue_rom) || Number(item.cost_rom) || 0),
        0,
      );

      // Generate next PCO number
      pcoSeed += 1;
      const pcoNumber = `PCO-${String(pcoSeed).padStart(3, "0")}`;

      // Insert into potential_change_orders (the actual PCO table)
      const { data: pco, error: pcoError } = await supabase
        .from("potential_change_orders")
        .insert({
          project_id: projectId,
          number: pcoNumber,
          title: pcoTitle,
          description: event.description ?? null,
          estimated_value: estimatedValue,
          status: "Draft",
          type: "Owner Change",
        })
        .select("id, number, title, status")
        .single();

      if (pcoError || !pco) {
        errors.push(
          `Failed to create PCO for change event ${event.id}: ${pcoError?.message ?? "unknown error"}`,
        );
        continue;
      }

      // Link the PCO back to the change event via change_event_related_items
      const { error: linkError } = await supabase
        .from("change_event_related_items")
        .insert({
          change_event_id: event.id,
          project_id: projectId,
          related_id: String(pco.id),
          related_type: "potential_change_order",
          related_number: pco.number,
          related_title: pco.title,
          related_status: pco.status,
        });

      if (linkError) {
        console.error(
          `PCO ${pco.id} created but linking to change event ${event.id} failed:`,
          linkError.message,
        );
      }

      pcos.push({ changeEventId: event.id, pcoId: pco.id });
    }

    if (pcos.length === 0) {
      return NextResponse.json(
        { error: "Failed to create any PCOs", details: errors },
        { status: 500 },
      );
    }

    return NextResponse.json({
      created: pcos.length,
      pcos,
      ...(errors.length > 0 ? { warnings: errors } : {}),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
