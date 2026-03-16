"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  MeetingData,
  ProjectData,
  CompanyData,
  UpdateResponse,
  DeleteResponse,
  CreateResponse,
  TableName,
  TableUpdate
} from "./table-actions.types";

export async function updateTableRow<T extends TableName>(
  tableName: T,
  id: string | number,
  data: TableUpdate<T>,
  revalidatePaths?: string[],
): Promise<UpdateResponse> {
  try {
    const supabase = await createSupabaseClient();

    const { error } = await supabase.from(tableName).update(data).eq("id", id);

    if (error) {
      return { error: error.message };
    }

    // Revalidate specified paths
    if (revalidatePaths) {
      revalidatePaths.forEach((path) => revalidatePath(path));
    } else {
      // Default revalidation
      revalidatePath("/");
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to update record" };
  }
}

export async function deleteTableRow(
  tableName: TableName,
  id: string | number,
  revalidatePaths?: string[],
): Promise<DeleteResponse> {
  try {
    const supabase = await createSupabaseClient();

    const { error } = await supabase.from(tableName).delete().eq("id", id);

    if (error) {
      return { error: error.message };
    }

    // Revalidate specified paths
    if (revalidatePaths) {
      revalidatePaths.forEach((path) => revalidatePath(path));
    } else {
      // Default revalidation
      revalidatePath("/");
    }

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete record" };
  }
}

// Specific actions for different tables
export async function updateMeeting(id: string, data: MeetingData) {
  return updateTableRow("document_metadata", id, data, ["/meetings"]);
}

export async function deleteMeeting(id: string) {
  return deleteTableRow("document_metadata", id, ["/meetings"]);
}

export async function updateProject(
  id: string | number,
  data: ProjectData,
) {
  return updateTableRow("projects", id, data, ["/projects", "/"]);
}

export async function deleteProject(id: string | number) {
  return deleteTableRow("projects", id, ["/projects", "/"]);
}

export async function createCompany(data: CompanyData): Promise<CreateResponse<CompanyData>> {
  try {
    const supabase = await createSupabaseClient();

    const { data: company, error } = await supabase
      .from("companies")
      .insert(data)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/companies");
    revalidatePath("/directory/companies");
    return { success: true, data: company };
  } catch (error) {
    return { error: "Failed to create company" };
  }
}

export async function updateCompany(id: string, data: Record<string, any>) {
  return updateTableRow("companies", id, data, [
    "/companies",
    "/directory/companies",
  ]);
}

export async function deleteCompany(id: string) {
  return deleteTableRow("companies", id, [
    "/companies",
    "/directory/companies",
  ]);
}

export async function createClient(data: Record<string, any>) {
  try {
    const supabase = await createSupabaseClient();

    const { data: client, error } = await supabase
      .from("companies")
      .insert({ ...data, type: "client" })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/clients");
    revalidatePath("/directory/clients");
    return { success: true, data: client };
  } catch (error) {
    return { error: "Failed to create client" };
  }
}

export async function updateClient(id: string, data: Record<string, any>) {
  return updateTableRow("companies", id, data, [
    "/clients",
    "/directory/clients",
  ]);
}

export async function deleteClient(id: string) {
  return deleteTableRow("companies", id, ["/clients", "/directory/clients"]);
}

export async function createContact(data: Record<string, any>) {
  try {
    const supabase = await createSupabaseClient();

    const { data: contact, error } = await supabase
      .from("people")
      .insert({ ...data, person_type: "contact" })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/contacts");
    revalidatePath("/directory/contacts");
    return { success: true, data: contact };
  } catch (error) {
    return { error: "Failed to create contact" };
  }
}

export async function updateContact(id: string, data: Record<string, any>) {
  return updateTableRow("people", id, data, [
    "/contacts",
    "/directory/contacts",
  ]);
}

export async function deleteContact(id: string) {
  return deleteTableRow("people", id, ["/contacts", "/directory/contacts"]);
}
