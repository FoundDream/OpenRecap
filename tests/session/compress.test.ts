import { describe, test, expect } from 'bun:test';
import path from 'node:path';
import { parseSession } from '../../src/session/parser.js';
import { compressSession } from '../../src/session/compress.js';

const FIXTURES = path.join(import.meta.dir, '..', 'fixtures');

describe('compressSession', () => {
  test('compresses linear session to readable text', () => {
    const parsed = parseSession(path.join(FIXTURES, 'linear-session.jsonl'));
    const chunks = compressSession(parsed);

    expect(chunks.length).toBe(1);
    expect(chunks[0]).toContain('[user]');
    expect(chunks[0]).toContain('[assistant]');
    expect(chunks[0]).toContain('hello world');
  });

  test('filters out non-user/assistant messages', () => {
    const parsed = parseSession(path.join(FIXTURES, 'compacted-session.jsonl'));
    const chunks = compressSession(parsed);

    // system messages should be filtered out
    for (const chunk of chunks) {
      expect(chunk).not.toContain('compact_boundary');
    }
  });

  test('formats tool_use and tool_result', () => {
    const parsed = parseSession(path.join(FIXTURES, 'linear-session.jsonl'));
    const chunks = compressSession(parsed);

    // Should contain tool formatting
    expect(chunks[0]).toContain('→ Tool: Write');
    expect(chunks[0]).toContain('← Result:');
  });

  test('returns single chunk for small sessions', () => {
    const parsed = parseSession(path.join(FIXTURES, 'linear-session.jsonl'));
    const chunks = compressSession(parsed);
    expect(chunks.length).toBe(1);
  });
});
