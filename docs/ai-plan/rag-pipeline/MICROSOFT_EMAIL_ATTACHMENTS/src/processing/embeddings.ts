const EMBEDDING_DIMENSIONS = 1536;

export async function generateEmbedding(_content: string): Promise<number[]> {
  return Array.from({ length: EMBEDDING_DIMENSIONS }, () => 0);
}
