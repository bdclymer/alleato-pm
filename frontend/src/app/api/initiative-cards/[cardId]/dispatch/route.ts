import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/initiative-cards/[cardId]/dispatch
 * Marks a card as dispatched to Claude Code.
 * Returns the CLI command that should be run to start the task.
 *
 * The actual execution happens client-side by copying the command
 * or triggering via the Agentation MCP server.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ cardId: string }> },
) {
  const { cardId } = await params;
  const supabase = await createClient();

  // Fetch the card
  const { data: card, error: fetchError } = await supabase
    .from("initiative_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Build a Claude Code prompt from card data
  const promptParts = [`Task: ${card.title}`];
  if (card.description) promptParts.push(`\nDetails: ${card.description}`);
  if (card.labels?.length) promptParts.push(`\nLabels: ${card.labels.join(", ")}`);
  if (card.priority) promptParts.push(`\nPriority: ${card.priority}`);
  if (card.github_issue_url) promptParts.push(`\nGitHub: ${card.github_issue_url}`);

  const prompt = promptParts.join("");

  // The CLI command to run — uses claude with --print for non-interactive
  const cliCommand = `claude --print "${prompt.replace(/"/g, '\\"')}"`;

  // Update dispatch status
  const { error: updateError } = await supabase
    .from("initiative_cards")
    .update({
      dispatch_status: "dispatched",
      status: card.status === "idea" ? "planned" : card.status,
    })
    .eq("id", cardId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    cardId,
    prompt,
    cliCommand,
    message: `Card dispatched to Claude Code. Run the command or use the Agentation MCP to execute.`,
  });
}
