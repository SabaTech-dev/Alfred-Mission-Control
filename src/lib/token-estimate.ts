/**
 * Rough token estimator using the chars/4 approximation.
 *
 * Good enough for a live input counter — not a substitute for a real
 * tokenizer, which we deliberately avoid adding as a dependency.
 *
 * @module token-estimate
 */

/** Estimate tokens as ceil(chars / 4). Minimum 0 for empty input. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
