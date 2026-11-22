/**
 * Grouping questions that mean the same thing, for the public feed's "asked N times"
 * and "similar questions". The meaning comes from a Workers AI embedding (bge-m3,
 * which handles English, Chinese and Malay alike). Grouping only affects how the feed
 * is shown; it never decides which answer a reader gets.
 */

export const EMBEDDING_MODEL = "@cf/baai/bge-m3";

/**
 * Cosine similarity at or above which two questions count as the same question asked
 * differently. Kept high, since a wrong group shows unrelated questions together.
 */
export const GROUP_THRESHOLD = 0.85;

/** Workers AI, as far as this file uses it. */
export interface EmbeddingAi {
  run(model: string, input: { text: string[] }): Promise<unknown>;
}

export async function embed(ai: EmbeddingAi | undefined, texts: string[]): Promise<number[][] | null> {
  if (!ai || texts.length === 0) return null;
  try {
    const result = (await ai.run(EMBEDDING_MODEL, { text: texts })) as { data?: number[][] };
    return Array.isArray(result.data) && result.data.length === texts.length ? result.data : null;
  } catch (error) {
    console.error("embedding failed", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

/** int8 per dimension, base64: about 1.4 KB per question instead of ~10 KB of JSON. Cosine ignores the scale. */
export function encodeVector(vector: number[]): string {
  const max = Math.max(...vector.map(Math.abs)) || 1;
  const bytes = new Uint8Array(vector.length);
  vector.forEach((value, index) => {
    bytes[index] = Math.round((value / max) * 127) & 0xff;
  });
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeVector(encoded: string): Int8Array {
  const binary = atob(encoded);
  const vector = new Int8Array(binary.length);
  for (let index = 0; index < binary.length; index++) vector[index] = (binary.charCodeAt(index) << 24) >> 24;
  return vector;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let index = 0; index < a.length; index++) {
    dot += a[index] * b[index];
    left += a[index] * a[index];
    right += b[index] * b[index];
  }
  return left && right ? dot / Math.sqrt(left * right) : 0;
}

/** The group of the closest earlier question, if it is close enough to be the same question. */
export function closestGroup(
  vector: ArrayLike<number>,
  candidates: { group: string; embedding: string }[],
): string | null {
  let best: { group: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = cosine(vector, decodeVector(candidate.embedding));
    if (score >= GROUP_THRESHOLD && (!best || score > best.score)) best = { group: candidate.group, score };
  }
  return best?.group ?? null;
}
