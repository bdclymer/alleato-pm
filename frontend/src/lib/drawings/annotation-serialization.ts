import type { Annotation, LocalAnnotationType } from "@/components/drawings/OsdDrawingViewer";

/** Row shape returned by the drawing_annotations API. */
export interface DrawingAnnotationRow {
  id: string;
  drawing_id: string;
  project_id: number;
  page: number;
  annotation_type: LocalAnnotationType;
  data: Omit<Annotation, "id" | "type" | "page">;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
}

/** DB row → the viewer's in-memory Annotation shape. */
export function rowToAnnotation(row: DrawingAnnotationRow): Annotation {
  return {
    id: row.id,
    type: row.annotation_type,
    page: row.page,
    ...row.data,
  };
}

/** Annotation → POST body (geometry + style go into `data`; id is server-assigned). */
export function annotationToBody(annotation: Annotation): {
  annotation_type: LocalAnnotationType;
  page: number;
  data: Omit<Annotation, "id" | "type" | "page">;
} {
  const data: Omit<Annotation, "id" | "type" | "page"> = {
    color: annotation.color,
    strokeWidth: annotation.strokeWidth,
    ...(annotation.points ? { points: annotation.points } : {}),
    ...(annotation.start ? { start: annotation.start } : {}),
    ...(annotation.end ? { end: annotation.end } : {}),
    ...(annotation.text !== undefined ? { text: annotation.text } : {}),
    ...(annotation.position ? { position: annotation.position } : {}),
  };
  return { annotation_type: annotation.type, page: annotation.page, data };
}
