import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const projectId = searchParams.get("project_id");
    const clientId = searchParams.get("client_id");
    const executedOnly = searchParams.get("executed_only") === "true";

    let query = supabase
      .from("contracts")
      .select(
        `
        *,
        client:clients!client_id(id, name),
        owner_client:clients!owner_client_id(id, name),
        contractor:clients!contractor_id(id, name),
        architect_engineer:clients!architect_engineer_id(id, name),
        project:projects(id, name, project_number)
      `,
      )
      .order("contract_number", { ascending: true });

    if (search) {
      query = query.or(
        `contract_number.ilike.%${search}%,title.ilike.%${search}%,notes.ilike.%${search}%`,
      );
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (projectId) {
      query = query.eq("project_id", parseInt(projectId));
    }

    if (clientId) {
      query = query.eq("client_id", parseInt(clientId));
    }

    if (executedOnly) {
      query = query.eq("executed", true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Build the contract insert object with all supported fields
    const contractData: Record<string, unknown> = {
      contract_number: body.contract_number,
      title: body.title,
      project_id: body.project_id,
      status: body.status || "draft",
      executed: body.executed || false,
      private: body.private || false,
    };

    // Add optional client references
    if (body.client_id) {
      contractData.client_id = body.client_id;
    }
    if (body.owner_client_id) {
      contractData.owner_client_id = body.owner_client_id;
    }
    if (body.contractor_id) {
      contractData.contractor_id = body.contractor_id;
    }
    if (body.architect_engineer_id) {
      contractData.architect_engineer_id = body.architect_engineer_id;
    }

    // Add financial fields
    if (body.default_retainage !== undefined) {
      contractData.default_retainage = body.default_retainage;
    }
    if (body.retention_percentage !== undefined) {
      contractData.retention_percentage = body.retention_percentage;
    }
    if (body.original_contract_amount !== undefined) {
      contractData.original_contract_amount = body.original_contract_amount;
    }

    // Add date fields
    if (body.start_date) {
      contractData.start_date = body.start_date;
    }
    if (body.estimated_completion_date) {
      contractData.estimated_completion_date = body.estimated_completion_date;
    }
    if (body.substantial_completion_date) {
      contractData.substantial_completion_date =
        body.substantial_completion_date;
    }
    if (body.actual_completion_date) {
      contractData.actual_completion_date = body.actual_completion_date;
    }
    if (body.signed_contract_received_date) {
      contractData.signed_contract_received_date =
        body.signed_contract_received_date;
    }
    if (body.contract_termination_date) {
      contractData.contract_termination_date = body.contract_termination_date;
    }

    // Add text fields
    if (body.description) {
      contractData.description = body.description;
    }
    if (body.inclusions) {
      contractData.inclusions = body.inclusions;
    }
    if (body.exclusions) {
      contractData.exclusions = body.exclusions;
    }
    if (body.notes) {
      contractData.notes = body.notes;
    }

    // Insert the contract
    const { data, error } = await supabase
      .from("contracts")
      .insert(contractData)
      .select(
        `
        *,
        client:clients!client_id(id, name),
        owner_client:clients!owner_client_id(id, name),
        contractor:clients!contractor_id(id, name),
        architect_engineer:clients!architect_engineer_id(id, name),
        project:projects(id, name, project_number)
      `,
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Handle allowed users for private contracts
    if (
      body.private &&
      body.allowed_users &&
      Array.isArray(body.allowed_users)
    ) {
      const allowedUsersData = body.allowed_users.map((userId: string) => ({
        contract_id: data.id,
        user_id: userId,
        can_see_sov_items: body.allowed_users_can_see_sov?.[userId] || false,
      }));

      if (allowedUsersData.length > 0) {
        const { error: usersError } = await supabase
          .from("contract_allowed_users")
          .insert(allowedUsersData);

        if (usersError) {
          }
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
