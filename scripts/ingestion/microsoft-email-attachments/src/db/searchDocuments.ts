import { EMBEDDING_DIMENSIONS } from "../processing/embeddings";
import { getPool } from "./pool";

export async function insertSearchDocument(input: {
  projectSyncId: string;
  sourceType: "email" | "attachment";
  sourceId: number;
  content: string;
  embedding: number[];
}): Promise<string> {
  if (input.embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Refusing to write ${input.embedding.length}-dim embedding; expected ${EMBEDDING_DIMENSIONS}.`);
  }

  const result = await getPool().query<{ id: string }>(
    `
      insert into search_documents (
        id, project_sync_id, source_type, source_id, content, embedding
      )
      values (gen_random_uuid(), $1, $2, $3, $4, $5::halfvec(3072))
      on conflict (project_sync_id, source_type, source_id)
      do update set
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

  return result.rows[0].id;
}
