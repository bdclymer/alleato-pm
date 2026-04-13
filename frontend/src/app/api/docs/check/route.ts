import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

export const GET = withApiGuardrails(
  "docs/check#GET",
  async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new GuardrailError({ code: "AUTH_EXPIRED", where: "docs/check#GET", message: "Authentication required." });
  }

  const docsRoot = path.join(process.cwd(), "../documentation/docs");

  try {
    await fs.access(docsRoot);
    return NextResponse.json({ exists: true, path: docsRoot });
  } catch {
    return NextResponse.json(
      { exists: false, path: docsRoot },
      { status: 404 },
    );
  }
  },
);
