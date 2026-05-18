import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { verifyProjectAccess, isAuthError } from "@/lib/supabase/auth-guard";

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// GET /api/projects/[id]/directory/roles
// Fetches all project roles with their assigned members
export const GET = withApiGuardrails(
  "projects/[projectId]/directory/roles#GET",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from("project_roles")
      .select("id, role_name, role_type, display_order")
      .eq("project_id", projectIdNum)
      .order("display_order", { ascending: true });

    if (rolesError) {
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // Fetch role members separately with explicit foreign key hint
    const roleIds = (roles || []).map((r) => r.id);
    const { data: roleMembers, error: membersError } = await supabase
      .from("project_role_members")
      .select(
        `
        id,
        project_role_id,
        person_id,
        assigned_at
      `,
      )
      .in("project_role_id", roleIds);

    if (membersError) {
      return NextResponse.json(
        { error: membersError.message },
        { status: 500 },
      );
    }

    // Fetch people details for all members
    const personIds = [...new Set((roleMembers || []).map((m) => m.person_id))];
    const peopleMap = new Map<
      string,
      {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone_mobile: string | null;
        phone_business: string | null;
        company_name: string | null;
      }
    >();

    if (personIds.length > 0) {
      const { data: people, error: peopleError } = await supabase
        .from("people")
        .select("id, first_name, last_name, email, phone_mobile, phone_business, company, company_data:companies!people_company_id_fkey(id, name)")
        .in("id", personIds);

      if (peopleError) {
        throw new GuardrailError({
          code: "UPSTREAM_FAILURE",
          where: "projects/[projectId]/directory/roles#GET",
          message: `Failed to load project role members: ${peopleError.message}`,
        });
      }

      (people || []).forEach((p) => {
        peopleMap.set(p.id, {
          id: p.id,
          first_name: p.first_name || "",
          last_name: p.last_name || "",
          email: p.email || "",
          phone_mobile: p.phone_mobile || null,
          phone_business: p.phone_business || null,
          company_name: (p.company_data as { name?: string } | null)?.name || p.company || null,
        });
      });
    }

    // Transform the data for easier consumption
    const transformedRoles = (roles || []).map((role) => {
      const members = (roleMembers || [])
        .filter((m) => m.project_role_id === role.id)
        .map((member) => {
          const person = peopleMap.get(member.person_id);
          return {
            id: member.id,
            person_id: member.person_id,
            assigned_at: member.assigned_at,
            person: person
              ? {
                  id: person.id,
                  first_name: person.first_name,
                  last_name: person.last_name,
                  full_name: `${person.first_name} ${person.last_name}`,
                  email: person.email,
                  phone_mobile: person.phone_mobile,
                  phone_business: person.phone_business,
                  company_name: person.company_name,
                }
              : null,
          };
        });

      return {
        id: role.id,
        role_name: role.role_name,
        role_type: role.role_type,
        display_order: role.display_order,
        members,
      };
    });

    return NextResponse.json({ data: transformedRoles });
    },
);

// PUT /api/projects/[id]/directory/roles
// Updates role members for a specific role
export const PUT = withApiGuardrails(
  "projects/[projectId]/directory/roles#PUT",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const body = await request.json();
    const { role_id, member_person_ids } = body;

    if (!role_id) {
      return NextResponse.json(
        { error: "role_id is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(member_person_ids)) {
      return NextResponse.json(
        { error: "member_person_ids must be an array" },
        { status: 400 },
      );
    }
    const uniqueMemberPersonIds = [...new Set(member_person_ids)];

    // Verify the role belongs to this project
    const { data: role, error: roleError } = await supabase
      .from("project_roles")
      .select("id, project_id")
      .eq("id", role_id)
      .eq("project_id", projectIdNum)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Role not found in this project" },
        { status: 404 },
      );
    }

    // Validate all person IDs exist in the people table.
    if (uniqueMemberPersonIds.length > 0) {
      const { data: existingPeople, error: peopleError } = await supabase
        .from("people")
        .select("id")
        .in("id", uniqueMemberPersonIds);

      if (peopleError) {
        return NextResponse.json(
          { error: `Failed to validate people: ${peopleError.message}` },
          { status: 500 },
        );
      }

      const validPersonIds = new Set((existingPeople || []).map((p) => p.id));
      const invalidPersonIds = uniqueMemberPersonIds.filter(
        (personId: string) => !validPersonIds.has(personId),
      );

      if (invalidPersonIds.length > 0) {
        return NextResponse.json(
          { error: "One or more selected people do not exist" },
          { status: 400 },
        );
      }
    }

    // Delete all existing members for this role
    const { error: deleteError } = await supabase
      .from("project_role_members")
      .delete()
      .eq("project_role_id", role_id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to update role members: ${deleteError.message}` },
        { status: 500 },
      );
    }

    // Insert new members if any
    if (uniqueMemberPersonIds.length > 0) {
      const newMembers = uniqueMemberPersonIds.map((person_id: string) => ({
        project_role_id: role_id,
        person_id,
      }));

      const { error: insertError } = await supabase
        .from("project_role_members")
        .insert(newMembers);

      if (insertError) {
        return NextResponse.json(
          { error: `Failed to add role members: ${insertError.message}` },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ success: true });
    },
);

// POST /api/projects/[id]/directory/roles
// Creates a new custom role for the project
export const POST = withApiGuardrails(
  "projects/[projectId]/directory/roles#POST",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const body = await request.json();
    const { role_name, role_type = "Person" } = body;

    if (!role_name) {
      return NextResponse.json(
        { error: "role_name is required" },
        { status: 400 },
      );
    }

    // Get the highest display_order for this project
    const { data: maxOrder } = await supabase
      .from("project_roles")
      .select("display_order")
      .eq("project_id", projectIdNum)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newDisplayOrder = (maxOrder?.display_order || 0) + 1;

    // Create the new role
    const { data: newRole, error: insertError } = await supabase
      .from("project_roles")
      .insert({
        project_id: projectIdNum,
        role_name,
        role_type,
        display_order: newDisplayOrder,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        // Unique constraint violation
        return NextResponse.json(
          { error: "A role with this name already exists" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to create role" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: newRole }, { status: 201 });
    },
);

// DELETE /api/projects/[id]/directory/roles
// Deletes a role from the project
export const DELETE = withApiGuardrails(
  "projects/[projectId]/directory/roles#DELETE",
  async ({ request, params }) => {
  
    const { projectId } = await params;
    const projectIdNum = parseInt(projectId, 10);

    const authResult = await verifyProjectAccess(projectIdNum);
    if (isAuthError(authResult)) return authResult;
    const supabase = authResult.serviceClient;

    const body = await request.json();
    const { role_id } = body;

    if (!role_id) {
      return NextResponse.json({ error: "role_id is required" }, { status: 400 });
    }

    const { data: role, error: roleError } = await supabase
      .from("project_roles")
      .select("id, project_id")
      .eq("id", role_id)
      .eq("project_id", projectIdNum)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { error: "Role not found in this project" },
        { status: 404 },
      );
    }

    const { error: memberDeleteError } = await supabase
      .from("project_role_members")
      .delete()
      .eq("project_role_id", role_id);

    if (memberDeleteError) {
      return NextResponse.json(
        { error: `Failed to delete role members: ${memberDeleteError.message}` },
        { status: 500 },
      );
    }

    const { error: roleDeleteError } = await supabase
      .from("project_roles")
      .delete()
      .eq("id", role_id)
      .eq("project_id", projectIdNum);

    if (roleDeleteError) {
      return NextResponse.json(
        { error: `Failed to delete role: ${roleDeleteError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
    },
);
