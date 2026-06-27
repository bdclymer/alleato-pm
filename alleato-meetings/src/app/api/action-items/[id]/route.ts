import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/auth-server";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Toggle an action item's status (open ⇄ done). Authed via Supabase session. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status === "done" ? "done" : "open";

  const { error } = await supabaseService().from("action_items").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status });
}
