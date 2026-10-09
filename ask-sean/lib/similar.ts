/**
 * Decide whether a new question is close enough to one already answered to reuse
 * its answer for free. Works on character bigrams so Chinese, English and Malay
 * all behave the same way, and refuses any pair whose numbers differ, because
 * "I earn RM5,000" and "I earn RM15,000" read almost identically but need
 * different answers.
 */

/**
 * Similarity at or above which an earlier answer is reused. Kept high on purpose:
 * "a good time to buy" vs "a good time to sell" scores 0.83, and a wrong reuse is
 * far worse than paying ~$0.0004 to answer again.
 */
export const REUSE_THRESHOLD = 0.9;

export function normalizeQuestion(question: string): string {
  return question
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1") // "5,000" → "5000"
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function bigrams(normalized: string): Map<string, number> {
  const compact = normalized.replace(/ /g, "");
  const counts = new Map<string, number>();
  for (let i = 0; i + 2 <= compact.length; i++) {
    const pair = compact.slice(i, i + 2);
    counts.set(pair, (counts.get(pair) ?? 0) + 1);
  }
  return counts;
}

function numbers(normalized: string): string {
  return (normalized.match(/\d+/g) ?? []).sort().join(",");
}

/** Dice coefficient of character bigrams, 0 to 1. Both inputs must already be normalized. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (numbers(a) !== numbers(b)) return 0;
  const left = bigrams(a);
  const right = bigrams(b);
  let total = 0;
  let shared = 0;
  for (const count of left.values()) total += count;
  for (const [pair, count] of right) {
    total += count;
    shared += Math.min(count, left.get(pair) ?? 0);
  }
  return total === 0 ? 0 : (2 * shared) / total;
}
