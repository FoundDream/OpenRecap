import { describe, test, expect } from 'bun:test';
import { estimateTokens } from '../../src/utils/tokens.js';

describe('estimateTokens', () => {
  test('estimates English text tokens', () => {
    const text = 'Hello, this is a test string with some words.';
    const tokens = estimateTokens(text);
    // ~45 chars × 0.25 ≈ ~12 tokens
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(30);
  });

  test('estimates CJK text tokens higher', () => {
    const text = '这是一段中文测试文本';
    const tokens = estimateTokens(text);
    // 10 CJK chars × 1.5 = 15 tokens
    expect(tokens).toBe(15);
  });

  test('handles mixed content', () => {
    const text = 'Hello 你好 World 世界';
    const tokens = estimateTokens(text);
    // Mix of CJK and latin
    expect(tokens).toBeGreaterThan(5);
  });

  test('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });
});
