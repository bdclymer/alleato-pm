import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { APP_BASE_URL } from "@/lib/email/client";

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email") || "test@example.com";
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: APP_BASE_URL + "/auth/callback" },
  });
  if (error) return NextResponse.json({ error: error.message });
  if (!data.properties?.action_link) return NextResponse.json({ error: "No link" });
  const actionUrl = new URL(data.properties.action_link);
  const token = actionUrl.searchParams.get("token");
  const confirmUrl = APP_BASE_URL + "/auth/confirm?token_hash=" + encodeURIComponent(token || "") + "&type=recovery&next=" + encodeURIComponent("/auth/update-password?email=" + encodeURIComponent(email));
  return NextResponse.json({ email, confirmUrl, token: token ? token.substring(0, 30) + "..." : "NONE" });
}
