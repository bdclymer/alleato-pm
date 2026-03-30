/**
 * POST /api/projects/[projectId]/change-events/add-to-pco
 *
 * Creates a Prime Contract PCO for each selected change event and links them
 * via change_event_related_items.
 *
 * Body: { changeEventIds: string[], contractId: string }
 * Returns: { created: number, pcos: { changeEventId: string, pcoId: number }[] }
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/api-error";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

const bodySchema = z.object({
  changeEventIds: z.array(z.string().uuid()).min(1),
  contractId: z.string().uuid(),
});

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

    const { changeEventIds, contractId } = parsed.data;
    const supabase = await createClient();

    // Fetch the selected change events so we can use their titles in PCO names
    const { data: changeEvents, error: fetchError } = await supabase
      .from("change_events")
      .select("id, number, title")
      .in("id", changeEventIds)
      .eq("project_id", projectId);

    if (fetchError) {
      return apiErrorResponse(fetchError);
    }

    if (!changeEvents || changeEvents.length === 0) {
      return NextResponse.json(
        { error: "No matching change events found" },
        { status: 404 },
      );
    }

    // Create a PCO for each change event
    const pcos: { changeEventId: string; pcoId: number }[] = [];
    const errors: string[] = [];

    for (const event of changeEvents) {
      const pcoTitle = event.title
        ? `PCO for ${event.number ?? event.id} — ${event.title}`
        : `PCO for ${event.number ?? event.id}`;

      // Insert the PCO record
      const { data: pco, error: pcoError } = await supabase
        .from("prime_contract_change_orders")
        .insert({
          project_id: projectId,
          contract_id: contractId,
          prime_contract_id: contractId,
          title: pcoTitle,
          status: "draft",
        })
        .select("id")
        .single();

      if (pcoError || !pco) {
        errors.push(`Failed to create PCO for change event ${event.id}: ${pcoError?.message ?? "unknown error"}`);
        continue;
      }

      // Link the PCO back to the change event via related items
      const { error: linkError } = await supabase
        .from("change_event_related_items")
        .insert({
          change_event_id: event.id,
          project_id: projectId,
          related_id: String(pco.id),
          related_type: "prime_contract_change_order",
          related_title: pcoTitle,
          related_status: "draft",
        });

      if (linkError) {
        // PCO was created — log the link failure but don't fail the whole operation
        console.error(
          `PCO ${pco.id} created but linking to change event ${event.id} failed:`,
          linkError.message,
        );
      }

      // Update the change event's prime_contract_id so the list page reflects the association
      await supabase
        .from("change_events")
        .update({ prime_contract_id: contractId })
        .eq("id", event.id)
        .eq("project_id", projectId);

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
