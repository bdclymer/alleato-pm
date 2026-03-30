import type { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

type Tables = Database["public"]["Tables"];
type Views = Database["public"]["Views"];
type Drawing = Tables["drawings"]["Row"];
type DrawingRevision = Tables["drawing_revisions"]["Row"];
type DrawingLogEntry = Views["drawing_log"]["Row"];
type DrawingSketch = Tables["drawing_sketches"]["Row"];
type DrawingDownload = Tables["drawing_downloads"]["Row"];
type DrawingRelatedItem = Tables["drawing_related_items"]["Row"];

type DrawingError = { type: string; message: string };
type Result<T, E = DrawingError> =
  | { data: T; error: null }
  | { data: null; error: E };

export interface DrawingFilters {
  search?: string;
  area_id?: string;
  discipline?: string;
  status?: string;
  set_id?: string;
  page?: number;
  page_size?: number;
}

export interface DrawingCreateInput {
  drawing_number: string;
  title: string;
  discipline?: string;
  drawing_type?: string;
  area_id?: string;
}

export interface DrawingUpdateInput {
  drawing_number?: string;
  title?: string;
  discipline?: string;
  drawing_type?: string;
  area_id?: string;
}

export interface RevisionCreateInput {
  revision_number: string;
  drawing_set_id?: string;
  drawing_date?: string;
  received_date: string;
  status?: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  description?: string;
}

export interface SketchCreateInput {
  file_url: string;
  name: string;
  sketch_number: string;
  description?: string;
}

export interface DrawingListResponse {
  drawings: DrawingLogEntry[];
  total_count: number;
  page: number;
  page_size: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface DrawingWithRevision extends Drawing {
  current_revision: DrawingRevision | null;
}

export interface FileUploadResult {
  url: string;
  path: string;
}

/**
 * Service class for drawing document management
 * Handles CRUD operations for drawings with revision tracking
 * CRITICAL: project_id is INTEGER (matches projects.id type)
 */
export class DrawingService {
  constructor(private supabase: ReturnType<typeof createClient<Database>>) {}

  /**
   * Get paginated list of drawings for a project with optional filters
   * Returns drawings from the drawing_log view with full revision details
   */
  async list(
    projectId: string,
    filters: DrawingFilters = {},
  ): Promise<Result<DrawingListResponse, DrawingError>> {
    const {
      search,
      area_id,
      discipline,
      status,
      set_id,
      page = 1,
      page_size = 50,
    } = filters;

    const projectIdNum = Number.parseInt(projectId, 10);
    const offset = (page - 1) * page_size;

    try {
      // Base query on drawing_log view
      let query = this.supabase
        .from("drawing_log")
        .select("*", { count: "exact" })
        .eq("project_id", projectIdNum);

      // Apply filters
      if (area_id) {
        query = query.eq("area_id", area_id);
      }

      if (discipline) {
        query = query.eq("discipline", discipline);
      }

      if (status) {
        query = query.eq("status", status);
      }

      if (set_id) {
        query = query.eq("drawing_set_id", set_id);
      }

      // Full-text search on drawing_number and title
      if (search) {
        query = query.or(
          `drawing_number.ilike.%${search}%,title.ilike.%${search}%`,
        );
      }

      // Apply pagination and ordering
      query = query
        .order("drawing_number", { ascending: true })
        .range(offset, offset + page_size - 1);

      const { data, error, count } = await query;

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
      }

      return {
        data: {
          drawings: (data || []) as DrawingLogEntry[],
          total_count: count || 0,
          page,
          page_size,
          has_next_page: offset + page_size < (count || 0),
          has_previous_page: page > 1,
        },
        error: null,
      };
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
   * Get a single drawing by ID with full details
   * Includes current revision details
   */
  async getById(
    projectId: string,
    drawingId: string,
  ): Promise<Result<DrawingWithRevision, DrawingError>> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      const { data, error } = await this.supabase
        .from("drawings")
        .select(
          `
          *,
          current_revision:drawing_revisions!fk_drawings_current_revision(*)
        `,
        )
        .eq("project_id", projectIdNum)
        .eq("id", drawingId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            data: null,
            error: {
              type: "NOT_FOUND",
              message: `Drawing with ID ${drawingId} not found`,
            },
          };
        }
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
      }

      const drawing: DrawingWithRevision = {
        ...data,
        current_revision: data.current_revision || null,
      };

      return { data: drawing, error: null };
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
   * Create a new drawing
   */
  async create(
    projectId: string,
    input: DrawingCreateInput,
    userId: string,
  ): Promise<Result<Drawing, DrawingError>> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Check for duplicate drawing number
      const { data: existing } = await this.supabase
        .from("drawings")
        .select("id")
        .eq("project_id", projectIdNum)
        .eq("drawing_number", input.drawing_number)
        .single();

      if (existing) {
        return {
          data: null,
          error: {
            type: "DUPLICATE_DRAWING_NUMBER",
            message: `Drawing number ${input.drawing_number} already exists for this project`,
          },
        };
      }

      const { data, error } = await this.supabase
        .from("drawings")
        .insert({
          project_id: projectIdNum,
          drawing_number: input.drawing_number,
          title: input.title,
          discipline: input.discipline || null,
          drawing_type: input.drawing_type || null,
          area_id: input.area_id || null,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * Update drawing metadata (not file)
   * For file updates, use createRevision()
   */
  async update(
    projectId: string,
    drawingId: string,
    input: DrawingUpdateInput,
  ): Promise<Result<Drawing, DrawingError>> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Check for duplicate drawing number if changing it
      if (input.drawing_number) {
        const { data: existing } = await this.supabase
          .from("drawings")
          .select("id")
          .eq("project_id", projectIdNum)
          .eq("drawing_number", input.drawing_number)
          .neq("id", drawingId)
          .single();

        if (existing) {
          return {
            data: null,
            error: {
              type: "DUPLICATE_DRAWING_NUMBER",
              message: `Drawing number ${input.drawing_number} already exists for this project`,
            },
          };
        }
      }

      const { data, error } = await this.supabase
        .from("drawings")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", drawingId)
        .eq("project_id", projectIdNum)
        .select()
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return {
            data: null,
            error: {
              type: "NOT_FOUND",
              message: `Drawing with ID ${drawingId} not found`,
            },
          };
        }
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * Delete a drawing and all associated data
   * Cascading deletes handled by database foreign keys
   * CRITICAL: Files in storage are NOT automatically deleted
   */
  async delete(
    projectId: string,
    drawingId: string,
  ): Promise<Result<void, DrawingError>> {
    const projectIdNum = Number.parseInt(projectId, 10);

    try {
      // Get all revision file URLs before deleting (for storage cleanup)
      const { data: revisions } = await this.supabase
        .from("drawing_revisions")
        .select("file_url")
        .eq("drawing_id", drawingId);

      // Delete the drawing (cascades to revisions, sketches, downloads, related items)
      const { error } = await this.supabase
        .from("drawings")
        .delete()
        .eq("id", drawingId)
        .eq("project_id", projectIdNum);

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
      }

      // Clean up storage files
      if (revisions && revisions.length > 0) {
        const filePaths = revisions
          .map((r) => {
            // Extract path from URL
            const url = new URL(r.file_url);
            const pathMatch = url.pathname.match(/project-files\/(.+)$/);
            return pathMatch ? pathMatch[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await this.supabase.storage.from("project-files").remove(filePaths);
        }
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
   * List all revisions for a drawing ordered by created_at desc
   */
  async listRevisions(
    drawingId: string,
  ): Promise<Result<DrawingRevision[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_revisions")
        .select("*")
        .eq("drawing_id", drawingId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * Create a new revision for a drawing
   * Database trigger handles unsetting other current revisions and updating drawings.current_revision_id
   */
  async createRevision(
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
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * Upload file to Supabase Storage
   * Returns URL and path for use in createRevision
   */
  async uploadFile(
    projectId: string,
    drawingId: string,
    file: File,
  ): Promise<Result<FileUploadResult, DrawingError>> {
    try {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        return {
          data: null,
          error: {
            type: "FILE_TOO_LARGE",
            message: "File must be under 50MB",
          },
        };
      }

      // Generate file path
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filePath = `drawings/${projectId}/${drawingId}/${timestamp}_${sanitizedFilename}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } =
        await this.supabase.storage
          .from("project-files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

      if (uploadError) {
        return {
          data: null,
          error: {
            type: "STORAGE_ERROR",
            message: `Failed to upload file: ${uploadError.message}`,
          },
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from("project-files")
        .getPublicUrl(filePath);

      return {
        data: {
          url: urlData.publicUrl,
          path: filePath,
        },
        error: null,
      };
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
   * Create a signed URL for downloading a file
   * Valid for 1 hour
   */
  async getDownloadUrl(
    filePath: string,
  ): Promise<Result<string, DrawingError>> {
    try {
      const { data, error } = await this.supabase.storage
        .from("project-files")
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        return {
          data: null,
          error: {
            type: "STORAGE_ERROR",
            message: `Failed to create download URL: ${error.message}`,
          },
        };
      }

      return { data: data.signedUrl, error: null };
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
   * Record a download event
   */
  async recordDownload(
    revisionId: string,
    userId: string,
  ): Promise<Result<DrawingDownload, DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_downloads")
        .insert({
          drawing_revision_id: revisionId,
          downloaded_by: userId,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * List all downloads for a revision
   */
  async listDownloads(
    revisionId: string,
  ): Promise<Result<DrawingDownload[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_downloads")
        .select("*")
        .eq("drawing_revision_id", revisionId)
        .order("downloaded_at", { ascending: false });

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
  async listSketches(
    revisionId: string,
  ): Promise<Result<DrawingSketch[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_sketches")
        .select("*")
        .eq("drawing_revision_id", revisionId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
   * Link a related item to a drawing
   */
  async linkRelatedItem(
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
        // Check if already linked (unique constraint violation)
        if (error.code === "23505") {
          // Fetch the existing linked item and return it
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
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
  async unlinkRelatedItem(
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
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
  async listRelatedItems(
    drawingId: string,
  ): Promise<Result<DrawingRelatedItem[], DrawingError>> {
    try {
      const { data, error } = await this.supabase
        .from("drawing_related_items")
        .select("*")
        .eq("drawing_id", drawingId)
        .order("created_at", { ascending: false });

      if (error) {
        return {
          data: null,
          error: { type: "UNKNOWN", message: error.message },
        };
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
}
