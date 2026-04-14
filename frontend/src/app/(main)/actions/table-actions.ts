"use server";

import {
  deleteRuntimeTableRow,
  updateRuntimeTableRow,
} from "@/lib/supabase/runtime-table";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  MeetingData,
  ProjectData,
  CompanyData,
  CompanyUpdateData,
  ContactData,
  ContactUpdateData,
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

    const { error } = await updateRuntimeTableRow(
      supabase,
      tableName,
      id,
      data as Record<string, unknown>,
    );

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
    return { error: error instanceof Error ? error.message : "Failed to update record" };
  }
}

export async function deleteTableRow(
  tableName: TableName,
  id: string | number,
  revalidatePaths?: string[],
): Promise<DeleteResponse> {
  try {
    const supabase = await createSupabaseClient();

    const { error } = await deleteRuntimeTableRow(supabase, tableName, id);

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
    return { error: error instanceof Error ? error.message : "Failed to delete record" };
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
    return { error: error instanceof Error ? error.message : "Failed to create company" };
  }
}

export async function updateCompany(id: string, data: CompanyUpdateData) {
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

export async function createClient(data: CompanyData) {
  try {
    const supabase = await createSupabaseClient();

    const { data: client, error } = await supabase
      .from("companies")
      .insert({ ...data, type: data.type ?? "client" })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/clients");
    revalidatePath("/directory/clients");
    return { success: true, data: client };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create client" };
  }
}

export async function updateClient(id: string, data: CompanyUpdateData) {
  return updateTableRow("companies", id, data, [
    "/clients",
    "/directory/clients",
  ]);
}

export async function deleteClient(id: string) {
  return deleteTableRow("companies", id, ["/clients", "/directory/clients"]);
}

export async function createContact(data: ContactData) {
  try {
    const supabase = await createSupabaseClient();

    const personType =
      data.person_type === "user" || data.person_type === "employee"
        ? data.person_type
        : "contact";

    const { data: contact, error } = await supabase
      .from("people")
      .insert({ ...data, person_type: personType })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/contacts");
    revalidatePath("/directory/contacts");
    return { success: true, data: contact };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create contact" };
  }
}

export async function updateContact(id: string, data: ContactUpdateData) {
  return updateTableRow("people", id, data, [
    "/contacts",
    "/directory/contacts",
  ]);
}

export async function deleteContact(id: string) {
  return deleteTableRow("people", id, ["/contacts", "/directory/contacts"]);
}
