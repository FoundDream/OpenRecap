import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { select, input, confirm } from '@inquirer/prompts';
import type { Config } from './types.js';

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
  return JSON.parse(raw) as Config;
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
    choices: [{ name: 'AWS Bedrock (Claude)', value: 'bedrock' as const }],
  });

  const awsRegion = await input({
    message: 'AWS Region:',
    default: 'us-east-1',
  });

  const awsBearerToken = await input({
    message: 'AWS Bearer Token (AWS_BEARER_TOKEN_BEDROCK):',
  });

  const model = await input({
    message: 'Model ID:',
    default: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  });

  const outputDir = await input({
    message: 'Default output directory:',
    default: path.join(homedir(), 'openrecap-reports'),
  });

  const config: Config = {
    provider,
    model,
    awsRegion,
    awsBearerToken,
    outputDir,
    format: 'html',
    language: 'auto',
  };

  saveConfig(config);
  console.log();
  console.log(`✅ Configuration saved to ${CONFIG_PATH}`);

  return config;
}
