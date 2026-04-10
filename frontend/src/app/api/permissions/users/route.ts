import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/permissions/users
 *
 * Returns every person with an auth account, along with:
 *   - is_admin flag from user_profiles
 *   - active project memberships and the template assigned on each
 *
 * Admin only.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: people, error: peopleError } = await supabase
      .from("people")
      .select("id, first_name, last_name, email, auth_user_id, profile_photo_url")
      .not("auth_user_id", "is", null)
      .order("last_name", { ascending: true });

    if (peopleError) {
      console.error("Error loading people:", peopleError);
      return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
    }

    const authIds = (people ?? [])
      .map((p) => p.auth_user_id)
      .filter((id): id is string => !!id);

    const personIds = (people ?? []).map((p) => p.id);

    const [profilesResult, membershipsResult] = await Promise.all([
      authIds.length
        ? supabase
            .from("user_profiles")
            .select("id, is_admin")
            .in("id", authIds)
        : Promise.resolve({ data: [] as { id: string; is_admin: boolean }[], error: null }),
      personIds.length
        ? supabase
            .from("project_directory_memberships")
            .select(
              `project_id, person_id, status,
               project:projects (id, name),
               permission_template:permission_templates (id, name, scope)`
            )
            .in("person_id", personIds)
            .eq("status", "active")
        : Promise.resolve({ data: [], error: null }),
    ]);

    const profileMap = new Map<string, boolean>();
    for (const row of profilesResult.data ?? []) {
      profileMap.set(row.id, row.is_admin === true);
    }

    const membershipsByPerson = new Map<
      string,
      Array<{
        projectId: number | string;
        projectName: string | null;
        templateId: string | null;
        templateName: string | null;
      }>
    >();

    for (const row of (membershipsResult.data ?? []) as Array<{
      project_id: number | string;
      person_id: string;
      project: { id: number | string; name: string } | { id: number | string; name: string }[] | null;
      permission_template:
        | { id: string; name: string; scope: string }
        | { id: string; name: string; scope: string }[]
        | null;
    }>) {
      const project = Array.isArray(row.project) ? row.project[0] : row.project;
      const template = Array.isArray(row.permission_template)
        ? row.permission_template[0]
        : row.permission_template;

      const list = membershipsByPerson.get(row.person_id) ?? [];
      list.push({
        projectId: row.project_id,
        projectName: project?.name ?? null,
        templateId: template?.id ?? null,
        templateName: template?.name ?? null,
      });
      membershipsByPerson.set(row.person_id, list);
    }

    const users = (people ?? []).map((p) => ({
      personId: p.id,
      authUserId: p.auth_user_id,
      firstName: p.first_name ?? "",
      lastName: p.last_name ?? "",
      email: p.email ?? "",
      profilePhotoUrl: p.profile_photo_url ?? null,
      isAdmin: p.auth_user_id ? profileMap.get(p.auth_user_id) === true : false,
      memberships: membershipsByPerson.get(p.id) ?? [],
    }));

    return NextResponse.json({ data: users });
  } catch (error) {
    console.error("Error loading permission users:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 }
    );
  }
}
