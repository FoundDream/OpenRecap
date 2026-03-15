const SENSITIVE_PATTERNS: { name: string; pattern: RegExp }[] = [
  {
    name: 'API key',
    pattern: /(?:sk|pk|api|key|token|secret|bearer)[-_]?[A-Za-z0-9]{20,}/gi,
  },
  {
    name: 'AWS access key',
    pattern: /AKIA[A-Z0-9]{16}/g,
  },
  {
    name: 'Connection string',
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^\s]+/gi,
  },
  {
    name: 'JWT',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    name: 'Private key',
    pattern: /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
  },
  {
    name: 'Generic password in URL',
    pattern: /:\/\/[^:]+:[^@]+@/g,
  },
];

/**
 * Sanitize text by replacing detected sensitive patterns with [REDACTED].
 * Returns the sanitized text and count of redactions made.
 */
export function sanitize(text: string): { text: string; redactedCount: number } {
  let result = text;
  let redactedCount = 0;

  for (const { pattern } of SENSITIVE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    const matches = result.match(pattern);
    if (matches) {
      redactedCount += matches.length;
      result = result.replace(pattern, '[REDACTED]');
    }
  }

  return { text: result, redactedCount };
}
