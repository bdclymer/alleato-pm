import { getPool } from "./pool";

export interface InsertSearchDocumentInput {
  projectSyncId: string;
  sourceType: "email" | "attachment";
  sourceId: number;
  content: string;
  embedding: number[];
}

export async function insertSearchDocument(input: InsertSearchDocumentInput): Promise<string> {
  if (!input.content.trim()) {
    throw new Error(`Cannot index empty ${input.sourceType} search document ${input.sourceId}.`);
  }

  const result = await getPool().query<{ id: string }>(
    `
      insert into search_documents (
        id,
        project_sync_id,
        source_type,
        source_id,
        content,
        embedding
      )
      values (gen_random_uuid(), $1, $2, $3, $4, $5)
      on conflict (project_sync_id, source_type, source_id)
      do update set
        project_sync_id = excluded.project_sync_id,
        content = excluded.content,
        embedding = excluded.embedding
      returning id
    `,
    [
      input.projectSyncId,
      input.sourceType,
      input.sourceId,
      input.content,
      `[${input.embedding.join(",")}]`,
    ],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(
      `Unable to insert or update search document for ${input.sourceType} ${input.sourceId}.`,
    );
  }

  return row.id;
}
