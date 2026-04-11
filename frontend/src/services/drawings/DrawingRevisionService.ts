import type {
  SupabaseClient,
  DrawingRevision,
  DrawingError,
  Result,
  RevisionCreateInput,
} from "./types";

/**
 * Service for drawing revision management
 */
export class DrawingRevisionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all revisions for a drawing ordered by created_at desc
   */
  async list(drawingId: string): Promise<Result<DrawingRevision[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_revisions")
        .select("*")
        .eq("drawing_id", drawingId)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: { type: "UNKNOWN", message: error.message } };
      }

      return { data: data || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          type: "UNKNOWN",
          message: err instanceof Error ? err.message : "an unexpected error occurred",
        },
      };
    }
  }

  /**
   * Create a new revision for a drawing.
   * Database trigger handles unsetting other current revisions
   * and updating drawings.current_revision_id.
   */
  async create(
    drawingId: string,
    input: RevisionCreateInput,
    userId: string,
  ): Promise<Result<DrawingRevision, DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_revisions")
        .insert({
          drawing_id: drawingId,
          revision_number: input.revision_number,
          drawing_set_id: input.drawing_set_id || null,
          drawing_date: input.drawing_date || null,
          received_date: input.received_date,
          status: input.status || "approved",
          file_url: input.file_url,
          file_name: input.file_name,
          file_size: input.file_size,
          file_type: input.file_type,
          description: input.description || null,
          uploaded_by: userId,
          is_current_revision: true,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: { type: "UNKNOWN", message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          type: "UNKNOWN",
          message: err instanceof Error ? err.message : "an unexpected error occurred",
        },
      };
    }
  }

  /**
   * Update the revision_number on a drawing revision row
   */
  async updateNumber(
    drawingId: string,
    revisionId: string,
    revisionNumber: string,
  ): Promise<Result<DrawingRevision, DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_revisions")
        .update({ revision_number: revisionNumber })
        .eq("id", revisionId)
        .eq("drawing_id", drawingId)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            data: null,
            error: { type: "NOT_FOUND", message: `Revision with ID ${revisionId} not found` },
          };
        }
        return { data: null, error: { type: "UNKNOWN", message: error.message } };
      }

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: {
          type: "UNKNOWN",
          message: err instanceof Error ? err.message : "an unexpected error occurred",
        },
      };
    }
  }
}
