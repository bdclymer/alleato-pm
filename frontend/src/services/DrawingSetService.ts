import type { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type DrawingSetError = { type: string; message: string };
type Result<T, E = DrawingSetError> = { data: T; error: null } | { data: null; error: E };

type DrawingSet = Database["public"]["Tables"]["drawing_sets"]["Row"];
type DrawingSetInsert = Database["public"]["Tables"]["drawing_sets"]["Insert"];
type DrawingSetUpdate = Database["public"]["Tables"]["drawing_sets"]["Update"];

export class DrawingSetService {
  constructor(private supabase: ReturnType<typeof createClient<Database>>) {}

  async list(projectId: string): Promise<Result<DrawingSet[]>> {
    const projectIdNum = Number.parseInt(projectId, 10);
    const { data, error } = await this.supabase
      .from("drawing_sets")
      .select("*")
      .eq("project_id", projectIdNum)
      .order("issued_at", { ascending: false });

    if (error) {
      return {
        data: null,
        error: {
          type: "DATABASE_ERROR",
          message: error.message,
        },
      };
    }

    return { data, error: null };
  }

  async create(
    projectId: string,
    input: { name: string; issued_at: string; description?: string },
    userId: string
  ): Promise<Result<DrawingSet>> {
    const insertData: DrawingSetInsert = {
      project_id: parseInt(projectId, 10),
      name: input.name,
      issued_at: input.issued_at,
      description: input.description ?? null,
      created_by: userId,
      status: "active",
    };

    const { data, error } = await this.supabase
      .from("drawing_sets")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          type: "DATABASE_ERROR",
          message: error.message,
        },
      };
    }

    return { data, error: null };
  }

  async update(
    setId: string,
    input: Partial<{ name: string; issued_at: string; description: string; status: string }>
  ): Promise<Result<DrawingSet>> {
    const updateData: DrawingSetUpdate = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.issued_at !== undefined) updateData.issued_at = input.issued_at;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;

    const { data, error } = await this.supabase
      .from("drawing_sets")
      .update(updateData)
      .eq("id", setId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          type: "DATABASE_ERROR",
          message: error.message,
        },
      };
    }

    return { data, error: null };
  }

  async archive(setId: string): Promise<Result<DrawingSet>> {
    const { data, error } = await this.supabase
      .from("drawing_sets")
      .update({ status: "archived" })
      .eq("id", setId)
      .select()
      .single();

    if (error) {
      return {
        data: null,
        error: {
          type: "DATABASE_ERROR",
          message: error.message,
        },
      };
    }

    return { data, error: null };
  }
}
