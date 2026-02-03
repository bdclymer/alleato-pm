import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL environment variable is not set");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is not set");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function getUserIdByEmail(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const user = data.users.find((candidate) => candidate.email === email);

  if (!user) {
    throw new Error(`No user found for email ${email}`);
  }

  return user.id;
}

export async function createProject(name: string): Promise<number> {
  const { data, error } = await supabase
    .from("projects")
    .insert({ name })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create project: ${error?.message}`);
  }

  return data.id as number;
}

export async function addProjectMember(
  projectId: number,
  userId: string,
  role: "admin" | "editor" | "owner" = "admin",
): Promise<void> {
  // Look up person_id from auth user ID via users_auth
  const { data: userAuth, error: lookupError } = await supabase
    .from("users_auth")
    .select("person_id")
    .eq("auth_user_id", userId)
    .single();

  if (lookupError || !userAuth) {
    throw new Error(
      `Failed to find person for auth user ${userId}: ${lookupError?.message ?? "not found"}`,
    );
  }

  const { error } = await supabase
    .from("project_directory_memberships")
    .insert({
      project_id: projectId,
      person_id: userAuth.person_id,
      role,
      user_type: "employee",
    });

  if (error) {
    throw new Error(`Failed to add project member: ${error.message}`);
  }
}

export interface ChangeOrderInput {
  project_id: number;
  co_number: string;
  title: string;
  description: string;
  status: string;
  submitted_at?: string | null;
  approved_at?: string | null;
}

export async function createChangeOrder(input: ChangeOrderInput) {
  const { data, error } = await supabase
    .from("change_orders")
    .insert(input)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create change order: ${error?.message}`);
  }

  return data;
}

export async function getChangeOrder(id: number) {
  const { data, error } = await supabase
    .from("change_orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to fetch change order: ${error.message}`);
  }

  return data;
}

let adminClient: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return adminClient;
}

export async function fetchChangeEventById(changeEventId: number) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('change_events')
    .select('*')
    .eq('id', changeEventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch change event: ${error.message}`);
  }

  return data;
}

export async function listChangeOrdersForProject(projectId: number) {
  const { data, error } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list change orders: ${error.message}`);
  }

  return data || [];
}

export async function countChangeOrdersForProject(projectId: number) {
  const { count, error } = await supabase
    .from("change_orders")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`Failed to count change orders: ${error.message}`);
  }

  return count || 0;
}

export async function fetchChangeEventByNumber(projectId: number, number: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('change_events')
    .select('*')
    .eq('project_id', projectId)
    .eq('number', number)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch change event by number: ${error.message}`);
  }

  return data;
}

export async function countChangeEvents(projectId: number) {
  const supabase = getAdminClient();
  const { count, error } = await supabase
    .from('change_events')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId);

  if (error) {
    throw new Error(`Failed to count change events: ${error.message}`);
  }

  return count ?? 0;
}

export async function deleteChangeOrder(id: number) {
  const { error } = await supabase.from("change_orders").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete change order: ${error.message}`);
  }
}

export async function deleteChangeOrdersByProject(projectId: number) {
  const { error } = await supabase
    .from("change_orders")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`Failed to delete change orders: ${error.message}`);
  }
}

export async function deleteProjectMembers(projectId: number) {
  const { error } = await supabase
    .from("project_directory_memberships")
    .delete()
    .eq("project_id", projectId);

  if (error) {
    throw new Error(`Failed to delete project members: ${error.message}`);
  }
}

export async function deleteProject(projectId: number) {
  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

export async function fetchLineItems(changeEventId: number) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('change_event_line_items')
    .select('*')
    .eq('change_event_id', changeEventId);

  if (error) {
    throw new Error(`Failed to fetch line items: ${error.message}`);
  }

  return data ?? [];
}
