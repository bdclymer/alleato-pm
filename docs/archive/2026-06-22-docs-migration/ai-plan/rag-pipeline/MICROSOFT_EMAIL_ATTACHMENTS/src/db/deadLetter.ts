import { getPool } from "./pool";

export interface DeadLetterInput {
  payload: unknown;
  error: string;
  stage?: string;
}

export async function writeToDLQ(input: DeadLetterInput): Promise<void> {
  await getPool().query(
    `
      insert into ingestion_dead_letter (
        payload,
        error
      )
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
