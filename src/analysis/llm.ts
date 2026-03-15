import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { Config } from "../types.js";

export function createModel(config: Config) {
  switch (config.provider) {
    case "bedrock": {
      const bedrock = createAmazonBedrock({
        region: config.awsRegion,
        // v4.x: apiKey is sent as "Authorization: Bearer <token>"
        // Falls back to SigV4 (env vars / ~/.aws/credentials) if not set
        ...(config.awsBearerToken ? { apiKey: config.awsBearerToken } : {}),
      });
      return bedrock(config.model);
    }
    case "openai-compatible": {
      const openaiCompatible = createOpenAICompatible({
        name: getProviderName(config.openaiBaseURL),
        baseURL: config.openaiBaseURL,
        ...(config.openaiApiKey ? { apiKey: config.openaiApiKey } : {}),
      });
      return openaiCompatible(config.model);
    }
  }
}

function getProviderName(baseURL: string): string {
  try {
    return new URL(baseURL).hostname || "openai-compatible";
  } catch {
    return "openai-compatible";
  }
}
