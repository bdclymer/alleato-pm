import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
}
