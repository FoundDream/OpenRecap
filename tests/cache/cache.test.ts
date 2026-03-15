import { describe, test, expect } from 'bun:test';
import { hashFile } from '../../src/cache/cache.js';
import path from 'node:path';

const FIXTURES = path.join(import.meta.dir, '..', 'fixtures');

describe('cache', () => {
  test('hashFile produces consistent SHA-256 hash', async () => {
    const filePath = path.join(FIXTURES, 'linear-session.jsonl');
    const hash1 = await hashFile(filePath);
    const hash2 = await hashFile(filePath);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('different files produce different hashes', async () => {
    const hash1 = await hashFile(path.join(FIXTURES, 'linear-session.jsonl'));
    const hash2 = await hashFile(path.join(FIXTURES, 'branching-session.jsonl'));

    expect(hash1).not.toBe(hash2);
  });
});
