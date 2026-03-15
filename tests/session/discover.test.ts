import { describe, test, expect } from 'bun:test';
import { parseDateOption } from '../../src/session/discover.js';

describe('parseDateOption', () => {
  test('parses "today" to current day range', () => {
    const { start, end } = parseDateOption('today');
    const now = new Date();

    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getDate()).toBe(now.getDate());
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);

    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });

  test('parses single date', () => {
    const { start, end } = parseDateOption('2026-03-14');

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2); // March = 2 (0-indexed)
    expect(start.getDate()).toBe(14);
    expect(start.getHours()).toBe(0);

    expect(end.getDate()).toBe(14);
    expect(end.getHours()).toBe(23);
  });

  test('parses date range', () => {
    const { start, end } = parseDateOption('2026-03-10:2026-03-14');

    expect(start.getDate()).toBe(10);
    expect(end.getDate()).toBe(14);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });
});
