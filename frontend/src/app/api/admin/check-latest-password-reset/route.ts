import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data } = await supabase.from("email_events").select("to_email, created_at").eq("template", "forgot-password").order("created_at", { ascending: false }).limit(1);
  return NextResponse.json(data?.[0] || {});
}
