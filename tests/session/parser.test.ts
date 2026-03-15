import { describe, test, expect } from 'bun:test';
import path from 'node:path';
import { parseSession } from '../../src/session/parser.js';

const FIXTURES = path.join(import.meta.dir, '..', 'fixtures');

describe('parseSession', () => {
  test('parses linear session correctly', () => {
    const messages = parseSession(path.join(FIXTURES, 'linear-session.jsonl'));

    // Should get all 7 messages in order (with assistant chunks merged)
    expect(messages.length).toBeGreaterThanOrEqual(5);

    // First message should be from user
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Help me write a hello world in TypeScript');

    // Last message should be assistant
    const last = messages[messages.length - 1];
    expect(last.role).toBe('assistant');
  });

  test('follows final branch in branching session', () => {
    const messages = parseSession(path.join(FIXTURES, 'branching-session.jsonl'));

    // Should follow the quicksort branch (b-1 → b-3 → b-4 → b-5 → b-6)
    // NOT the bubble sort branch (b-1 → b-2)
    const texts = messages
      .filter((m) => typeof m.content === 'string')
      .map((m) => m.content as string);

    // The bubble sort response should NOT be in the path
    expect(texts).not.toContain("Here's a bubble sort implementation.");

    // The quicksort response should be in the path
    const allContent = messages.map((m) => {
      if (typeof m.content === 'string') return m.content;
      return m.content.map((b) => ('text' in b ? b.text : '')).join('');
    }).join(' ');

    expect(allContent).toContain('quicksort');
  });

  test('handles compact_boundary with logicalParentUuid', () => {
    const messages = parseSession(path.join(FIXTURES, 'compacted-session.jsonl'));

    // Should traverse across the compact_boundary
    expect(messages.length).toBeGreaterThanOrEqual(3);

    // First message should be from the start
    expect(messages[0].role).toBe('user');

    // Should include messages after the compact boundary
    const allContent = messages.map((m) => {
      if (typeof m.content === 'string') return m.content;
      return m.content.map((b) => ('text' in b ? b.text : '')).join('');
    }).join(' ');

    expect(allContent).toContain('parser');
  });

  test('throws for nonexistent file', () => {
    expect(() => parseSession(path.join(FIXTURES, 'nonexistent.jsonl'))).toThrow();
  });

  test('merges consecutive assistant chunks with same requestId', () => {
    const messages = parseSession(path.join(FIXTURES, 'linear-session.jsonl'));

    // msg-2 and msg-3 share requestId "req-1", should be merged
    const assistantMsgs = messages.filter((m) => m.role === 'assistant');
    // Check that the first assistant message has merged content
    const firstAssistant = assistantMsgs[0];
    expect(Array.isArray(firstAssistant.content)).toBe(true);
    if (Array.isArray(firstAssistant.content)) {
      // Should have both a text block and a tool_use block from merging
      const types = firstAssistant.content.map((b) => b.type);
      expect(types).toContain('text');
      expect(types).toContain('tool_use');
    }
  });
});
