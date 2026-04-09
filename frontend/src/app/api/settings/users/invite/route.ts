import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Resend } from "resend";

import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Alleato <noreply@alleato.group>";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
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
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://app.alleato.group";
    const displayName = fullName ?? email;

    const { error: emailError } = await resend.emails.send(
      {
        from: FROM,
        to: [email],
        subject: "You've been invited to Alleato",
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#F6F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #E8E8EC;">
              <span style="font-size:18px;font-weight:600;color:#111118;letter-spacing:-0.01em;">Alleato</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#111118;font-weight:600;">
                Hi ${displayName},
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6B6B80;">
                You've been invited to join Alleato — a construction project management platform. Click the button below to accept your invitation and set up your account.
              </p>
              <p style="margin:0 0 32px;font-size:13px;line-height:1.6;color:#9898A6;">
                This invitation link will expire in 24 hours.
              </p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#5856D6;border-radius:6px;">
                    <a href="${appUrl}" style="display:inline-block;padding:11px 24px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #E8E8EC;background:#F6F6F8;">
              <p style="margin:0;font-size:12px;color:#9898A6;line-height:1.5;">
                If you didn't expect this invitation, you can ignore this email.<br />
                © ${new Date().getFullYear()} Alleato Group
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      },
      { idempotencyKey: `user-invite/${email}` }
    );

    if (emailError) {
      // Don't fail the request — Supabase already sent the magic link
      console.error("Resend error (non-fatal):", emailError.message);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
