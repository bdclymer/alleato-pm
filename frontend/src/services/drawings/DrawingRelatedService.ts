import type {
  SupabaseClient,
  DrawingSketch,
  DrawingRelatedItem,
  DrawingError,
  Result,
  SketchCreateInput,
} from "./types";

/**
 * Service for drawing-related items (cross-tool links) and sketches
 */
export class DrawingRelatedService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Link a related item to a drawing
   */
  async link(
    drawingId: string,
    relatedType: string,
    relatedId: string,
    userId: string,
  ): Promise<Result<DrawingRelatedItem, DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_related_items")
        .insert({
          drawing_id: drawingId,
          related_type: relatedType,
          related_id: relatedId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation — return existing record
        if (error.code === "23505") {
          const { data: existingData } = await this.supabase
            .from("drawing_related_items")
            .select("*")
            .eq("drawing_id", drawingId)
            .eq("related_type", relatedType)
            .eq("related_id", relatedId)
            .single();

          if (existingData) {
            return { data: existingData, error: null };
          }
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

  /**
   * Unlink a related item from a drawing
   */
  async unlink(
    drawingId: string,
    relatedType: string,
    relatedId: string,
  ): Promise<Result<void, DrawingError>> {
    try {
      const { error } = await this.supabase
        .from("drawing_related_items")
        .delete()
        .eq("drawing_id", drawingId)
        .eq("related_type", relatedType)
        .eq("related_id", relatedId);

      if (error) {
        return { data: null, error: { type: "UNKNOWN", message: error.message } };
      }

      return { data: undefined as unknown as void, error: null };
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
   * List all related items for a drawing
   */
  async list(drawingId: string): Promise<Result<DrawingRelatedItem[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_related_items")
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
   * List all sketches for a revision
   */
  async listSketches(revisionId: string): Promise<Result<DrawingSketch[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_sketches")
        .select("*")
        .eq("drawing_revision_id", revisionId)
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
   * Create a sketch for a revision
   */
  async createSketch(
    revisionId: string,
    input: SketchCreateInput,
    userId: string,
  ): Promise<Result<DrawingSketch, DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_sketches")
        .insert({
          drawing_revision_id: revisionId,
          file_url: input.file_url,
          name: input.name,
          sketch_number: input.sketch_number,
          description: input.description || null,
          created_by: userId,
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
}
