import { describe, expect, test } from 'bun:test';
import { configSchema } from '../src/types.js';

describe('configSchema', () => {
  test('parses bedrock config', () => {
    const config = configSchema.parse({
      provider: 'bedrock',
      model: 'anthropic.claude-haiku-4-5-20251001-v1:0',
      awsRegion: 'us-east-1',
      outputDir: '/tmp/openrecap',
      format: 'html',
      language: 'auto',
    });

    expect(config.provider).toBe('bedrock');
    expect(config.awsRegion).toBe('us-east-1');
  });

  test('parses openai-compatible config', () => {
    const config = configSchema.parse({
      provider: 'openai-compatible',
      model: 'gpt-4.1-mini',
      openaiBaseURL: 'https://api.openai.com/v1',
      outputDir: '/tmp/openrecap',
      format: 'html',
      language: 'auto',
    });

    expect(config.provider).toBe('openai-compatible');
    expect(config.openaiBaseURL).toBe('https://api.openai.com/v1');
  });
});
