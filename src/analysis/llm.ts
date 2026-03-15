import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import type { Config } from '../types.js';

export function createModel(config: Config) {
  const bedrock = createAmazonBedrock({
    region: config.awsRegion,
    // v4.x: apiKey is sent as "Authorization: Bearer <token>"
    // Falls back to SigV4 (env vars / ~/.aws/credentials) if not set
    ...(config.awsBearerToken ? { apiKey: config.awsBearerToken } : {}),
  });
  return bedrock(config.model);
}
