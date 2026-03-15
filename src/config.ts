import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { select, input, confirm } from '@inquirer/prompts';
import { configSchema, type Config } from './types.js';

const CONFIG_DIR = path.join(homedir(), '.openrecap');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function loadConfig(): Config {
  if (!configExists()) {
    throw new Error('Configuration not found. Run `openrecap config` to set up.');
  }
  const raw = readFileSync(CONFIG_PATH, 'utf-8');
  return configSchema.parse(JSON.parse(raw));
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export async function runSetup(): Promise<Config> {
  console.log();
  console.log('🔧 Welcome to OpenRecap! Let\'s set up your configuration.');
  console.log();

  const agreed = await confirm({
    message:
      'OpenRecap sends your Claude Code session content to LLM APIs for analysis. ' +
      'Session data may contain code, file paths, and terminal output. Continue?',
    default: true,
  });

  if (!agreed) {
    console.log('Setup cancelled.');
    process.exit(0);
  }

  const provider = await select({
    message: 'Select LLM provider:',
    choices: [
      { name: 'AWS Bedrock (Claude)', value: 'bedrock' as const },
      { name: 'OpenAI Compatible', value: 'openai-compatible' as const },
    ],
  });

  const outputDir = await input({
    message: 'Default output directory:',
    default: path.join(homedir(), 'openrecap-reports'),
  });

  const commonConfig = {
    outputDir,
    format: 'html' as const,
    language: 'auto' as const,
  };

  const config: Config =
    provider === 'bedrock'
      ? await buildBedrockConfig(commonConfig)
      : await buildOpenAICompatibleConfig(commonConfig);

  saveConfig(config);
  console.log();
  console.log(`✅ Configuration saved to ${CONFIG_PATH}`);

  return config;
}

async function buildBedrockConfig(
  commonConfig: Pick<Config, 'outputDir' | 'format' | 'language'>,
): Promise<Config> {
  const awsRegion = await input({
    message: 'AWS Region:',
    default: 'us-east-1',
  });

  const awsBearerToken = await input({
    message: 'AWS Bearer Token (optional, AWS_BEARER_TOKEN_BEDROCK):',
  });

  const model = await input({
    message: 'Model ID:',
    default: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  });

  return {
    provider: 'bedrock',
    model,
    awsRegion,
    awsBearerToken: emptyToUndefined(awsBearerToken),
    ...commonConfig,
  };
}

async function buildOpenAICompatibleConfig(
  commonConfig: Pick<Config, 'outputDir' | 'format' | 'language'>,
): Promise<Config> {
  const openaiBaseURL = normalizeBaseURL(
    await input({
      message: 'OpenAI-compatible Base URL:',
      default: 'https://api.openai.com/v1',
      validate: (value) => {
        try {
          const url = new URL(value);
          return url.protocol === 'http:' || url.protocol === 'https:'
            ? true
            : 'Base URL must start with http:// or https://';
        } catch {
          return 'Enter a valid URL';
        }
      },
    }),
  );

  const openaiApiKey = await input({
    message: 'OpenAI API Key (optional):',
  });

  const model = await input({
    message: 'Model ID:',
    default:
      openaiBaseURL === 'https://api.openai.com/v1' ? 'gpt-4.1-mini' : '',
    validate: (value) =>
      value.trim().length > 0 ? true : 'Model ID cannot be empty',
  });

  return {
    provider: 'openai-compatible',
    model,
    openaiBaseURL,
    openaiApiKey: emptyToUndefined(openaiApiKey),
    ...commonConfig,
  };
}

function emptyToUndefined(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
