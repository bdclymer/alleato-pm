import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import InviteUser from "@/emails/auth/InviteUser";

export const POST = withApiGuardrails(
  "settings/users/invite#POST",
  async ({ request }) => {
  
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "settings/users/invite#POST", message: "Authentication required." });
    }

    const body = (await request.json()) as {
      email: string;
      full_name?: string;
      role?: string;
    };

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();
    const fullName = body.full_name?.trim() || null;
    const role = body.role || null;

    // Check if user already exists in user_profiles
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // Invite via Supabase Auth admin (creates user + sends magic link)
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          role,
        },
      });

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message },
        { status: 400 }
      );
    }

    // Upsert user_profiles row so the user appears in the list immediately
    if (inviteData.user) {
      await supabase.from("user_profiles").upsert(
        {
          id: inviteData.user.id,
          email,
          full_name: fullName,
          role,
          is_active: true,
          is_admin: false,
        },
        { onConflict: "id" }
      );
    }

    // Send branded Resend email with context
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "https://app.alleato.group";

    // Get the inviter's display name for the template
    const { data: inviterProfile } = await supabase
      .from("user_profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    const inviterName =
      inviterProfile?.full_name || inviterProfile?.email || "An Alleato admin";

    const { error: emailError } = await sendEmail({
      template: "user-invite",
      to: email,
      subject: "You've been invited to Alleato",
      react: InviteUser({
        inviterName,
        inviteeName: fullName ?? undefined,
        role: role ?? undefined,
        acceptUrl: appUrl,
        expiresInHours: 24,
      }),
      entity: inviteData.user
        ? { type: "user_invite", id: inviteData.user.id }
        : undefined,
      userId: inviteData.user?.id,
      idempotencyKey: `user-invite/${email}`,
    });

    if (emailError) {
      // Don't fail the request — Supabase already sent the magic link
      logger.error({ msg: "Resend error (non-fatal)", error: emailError.message });
    }

    return NextResponse.json({ success: true });
    },
);
