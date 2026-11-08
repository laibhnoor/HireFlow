import { toVectorLiteral } from "@/lib/ai/embeddings";
import { prisma } from "@/lib/db";

export type RetrievedChunk = {
  id: string;
  section: string;
  content: string;
  similarity: number;
};

export async function countIndexedChunks(cvId: string) {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT count(*)::bigint AS count
    FROM "CvChunk"
    WHERE "cvId" = ${cvId} AND embedding IS NOT NULL
  `;
  return Number(rows[0]?.count ?? 0);
}

/**
 * Exact cosine search over one CV's chunks. HNSW is intentionally deferred
 * until chunk volume justifies an index; at this size a sequential scan is
 * fast and keeps the schema free of unmanaged index drift.
 */
export async function retrieveEvidence(
  cvId: string,
  embedding: number[],
  limit = 4,
): Promise<RetrievedChunk[]> {
  const literal = toVectorLiteral(embedding);

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      section: string;
      content: string;
      similarity: number | string;
    }>
  >`
    SELECT
      id,
      section,
      content,
      1 - (embedding <=> ${literal}::vector) AS similarity
    FROM "CvChunk"
    WHERE "cvId" = ${cvId} AND embedding IS NOT NULL
    ORDER BY embedding <=> ${literal}::vector
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    section: row.section,
    content: row.content,
    similarity: clampSimilarity(Number(row.similarity)),
  }));
}

export function clampSimilarity(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
