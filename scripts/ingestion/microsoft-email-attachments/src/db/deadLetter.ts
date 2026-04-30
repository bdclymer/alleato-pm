import { getPool } from "./pool";

export async function writeToDLQ(input: {
  payload: unknown;
  error: string;
  stage?: string;
}): Promise<void> {
  await getPool().query(
    `
      insert into ingestion_dead_letter (payload, error)
      values ($1, $2)
    `,
    [
      JSON.stringify({
        source: "microsoft_email_attachments",
        stage: input.stage ?? null,
        payload: input.payload,
      }),
      input.error,
    ],
  );
}
