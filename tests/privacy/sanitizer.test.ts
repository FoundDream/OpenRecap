import { describe, test, expect } from 'bun:test';
import { sanitize } from '../../src/privacy/sanitizer.js';

describe('sanitize', () => {
  test('redacts API keys', () => {
    const input = 'My key is sk-1234567890abcdefghijklmnop';
    const { text, redactedCount } = sanitize(input);
    expect(text).toContain('[REDACTED]');
    expect(text).not.toContain('sk-1234567890abcdefghijklmnop');
    expect(redactedCount).toBeGreaterThan(0);
  });

  test('redacts AWS access keys', () => {
    const input = 'AWS key: AKIAIOSFODNN7EXAMPLE';
    const { text } = sanitize(input);
    expect(text).toContain('[REDACTED]');
    expect(text).not.toContain('AKIAIOSFODNN7EXAMPLE');
  });

  test('redacts connection strings', () => {
    const input = 'DB: postgres://admin:secret@db.example.com/mydb';
    const { text } = sanitize(input);
    expect(text).toContain('[REDACTED]');
    expect(text).not.toContain('admin:secret');
  });

  test('redacts JWTs', () => {
    const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    const { text } = sanitize(input);
    expect(text).toContain('[REDACTED]');
  });

  test('redacts private key headers', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...';
    const { text } = sanitize(input);
    expect(text).toContain('[REDACTED]');
  });

  test('does not redact normal text', () => {
    const input = 'This is a normal coding session about TypeScript generics.';
    const { text, redactedCount } = sanitize(input);
    expect(text).toBe(input);
    expect(redactedCount).toBe(0);
  });

  test('handles multiple redactions', () => {
    const input = 'Key: sk-abcdefghijklmnopqrstuvwxyz123, DB: postgres://user:pass@host/db';
    const { text, redactedCount } = sanitize(input);
    expect(redactedCount).toBeGreaterThanOrEqual(2);
    expect(text).not.toContain('sk-abcdefghijklmnopqrstuvwxyz123');
    expect(text).not.toContain('user:pass');
  });
});
