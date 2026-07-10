import assert from "node:assert/strict";
import test from "node:test";

import {
  annotationToBody,
  rowToAnnotation,
  type DrawingAnnotationRow,
} from "../annotation-serialization";

test("drawing annotation serialization", async (t) => {
  await t.test("rowToAnnotation flattens data onto the annotation", () => {
    const row: DrawingAnnotationRow = {
      id: "server-uuid",
      drawing_id: "d1",
      project_id: 42,
      page: 3,
      annotation_type: "text",
      data: {
        color: "#ef4444",
        strokeWidth: 2,
        text: "Note",
        position: { x: 10, y: 20 },
      },
      is_published: false,
      created_by: "u1",
      created_at: "2026-07-10T00:00:00Z",
    };

    const annotation = rowToAnnotation(row);

    assert.equal(annotation.id, "server-uuid");
    assert.equal(annotation.type, "text");
    assert.equal(annotation.page, 3);
    assert.equal(annotation.color, "#ef4444");
    assert.equal(annotation.text, "Note");
    assert.deepEqual(annotation.position, { x: 10, y: 20 });
  });

  await t.test("annotationToBody drops the id and nests geometry under data", () => {
    const body = annotationToBody({
      id: "client-uid",
      type: "arrow",
      page: 1,
      color: "#3b82f6",
      strokeWidth: 4,
      start: { x: 0, y: 0 },
      end: { x: 5, y: 5 },
    });

    assert.equal(body.annotation_type, "arrow");
    assert.equal(body.page, 1);
    // The client id must never be sent — the server assigns the row id.
    assert.equal("id" in body.data, false);
    assert.equal(body.data.color, "#3b82f6");
    assert.deepEqual(body.data.start, { x: 0, y: 0 });
    assert.deepEqual(body.data.end, { x: 5, y: 5 });
  });

  await t.test("round-trips geometry through body → row → annotation", () => {
    const original = {
      id: "client-uid",
      type: "pen" as const,
      page: 2,
      color: "#22c55e",
      strokeWidth: 2,
      points: [
        { x: 1, y: 1 },
        { x: 2, y: 3 },
      ],
    };

    const body = annotationToBody(original);
    const row: DrawingAnnotationRow = {
      id: "server-uuid",
      drawing_id: "d1",
      project_id: 1,
      page: body.page,
      annotation_type: body.annotation_type,
      data: body.data,
      is_published: true,
      created_by: "u1",
      created_at: "2026-07-10T00:00:00Z",
    };
    const restored = rowToAnnotation(row);

    // Everything but the id survives the round trip; the id becomes the server id.
    assert.equal(restored.id, "server-uuid");
    assert.equal(restored.type, original.type);
    assert.equal(restored.page, original.page);
    assert.equal(restored.color, original.color);
    assert.deepEqual(restored.points, original.points);
  });
});
