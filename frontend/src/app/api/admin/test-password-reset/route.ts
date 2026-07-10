import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { APP_BASE_URL } from "@/lib/email/client";
import { buildPasswordResetUrl } from "@/lib/email/invite-links";

export async function GET() {
  const testEmail = "test-reset-" + Date.now() + "@example.com";
  const supabase = createServiceClient();

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: testEmail,
    options: { redirectTo: APP_BASE_URL + "/auth/callback" },
  });

  if (linkError || !linkData.properties?.action_link) {
    return NextResponse.json({ error: linkError?.message }, { status: 500 });
  }

  const resetUrl = buildPasswordResetUrl(linkData.properties.action_link, testEmail);
  const token = new URL(resetUrl).searchParams.get("token_hash");

  return NextResponse.json({
    testEmail,
    resetUrl,
    tokenExists: token ? true : false,
    tokenLength: token ? token.length : 0,
    success: true
  });
}
