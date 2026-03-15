/**
 * Estimate token count for a string.
 * CJK characters count as ~1.5 tokens, other characters ~0.25 tokens per char.
 */
export function estimateTokens(text: string): number {
  let tokens = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // CJK Unified Ideographs + common CJK ranges
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified
      (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
      (code >= 0x3000 && code <= 0x303f) || // CJK Punctuation
      (code >= 0xff00 && code <= 0xffef) // Fullwidth Forms
    ) {
      tokens += 1.5;
    } else {
      tokens += 0.25;
    }
  }
  return Math.ceil(tokens);
}
