import { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { configExists, loadConfig, runSetup } from './config.js';
import { parseDateOption, discoverSessions } from './session/discover.js';
import { mapAllSessions } from './analysis/map.js';
import { reduceAnalyses } from './analysis/reduce.js';
import { renderHTML } from './render/html.js';
import { openInBrowser } from './utils/open.js';
import { estimateTokens } from './utils/tokens.js';
import { log, spinner } from './utils/logger.js';
import { getCached } from './cache/cache.js';
import type { DiscoveredSession } from './types.js';

const program = new Command();

program
  .name('openrecap')
  .description('Review your daily Claude Code sessions and generate learning reports')
  .version('0.1.0')
  .option('--date <date>', 'Target date or range (e.g. today, 2026-03-14, 2026-03-10:2026-03-14)', 'today')
  .option('--format <format>', 'Output format: html | md', 'html')
  .option('--output <dir>', 'Output directory')
  .option('--dry-run', 'Preview mode: show sessions without calling LLM')
  .option('--no-cache', 'Skip cache for analysis (still writes cache)')
  .option('--concurrency <n>', 'LLM concurrency limit', '3')
  .action(async (opts) => {
    try {
      // Load or create config
      let config;
      if (!configExists()) {
        config = await runSetup();
      } else {
        config = loadConfig();
      }

      // Parse date
      const dateRange = parseDateOption(opts.date);
      const dateStr = formatDateRange(opts.date, dateRange);

      // Discover sessions
      const spin = spinner('Discovering sessions...');
      const sessions = await discoverSessions(dateRange);
      spin.stop();

      if (sessions.length === 0) {
        log.info(`No sessions found for ${dateStr}.`);
        process.exit(0);
      }

      // Dry-run mode
      if (opts.dryRun) {
        await printDryRun(sessions, dateStr);
        process.exit(0);
      }

      // Map phase
      const mapResults = await mapAllSessions(sessions, config, {
        noCache: !opts.cache,
        concurrency: parseInt(opts.concurrency, 10),
      });

      if (mapResults.length === 0) {
        log.warn('No sessions produced analysis results.');
        process.exit(1);
      }

      // Reduce phase
      const report = await reduceAnalyses(mapResults, config);

      // Render
      const outputDir = opts.output || config.outputDir;
      mkdirSync(outputDir.replace('~', process.env.HOME || ''), { recursive: true });

      const resolvedDir = outputDir.replace('~', process.env.HOME || '');
      const fileName = `${formatDateForFilename(opts.date, dateRange)}.html`;
      const outputPath = path.join(resolvedDir, fileName);

      const html = renderHTML(report, dateStr);
      writeFileSync(outputPath, html, 'utf-8');

      log.success(`Report saved to ${outputPath}`);
      openInBrowser(outputPath);
    } catch (e) {
      log.error(String(e));
      process.exit(1);
    }
  });

program
  .command('config')
  .description('Reconfigure OpenRecap')
  .action(async () => {
    await runSetup();
  });

program.parse();

// ─── Helpers ───

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateRange(
  input: string,
  range: { start: Date; end: Date },
): string {
  if (input === 'today') {
    return formatLocalDate(range.start);
  }
  if (input.includes(':')) {
    return `${formatLocalDate(range.start)} to ${formatLocalDate(range.end)}`;
  }
  return input;
}

function formatDateForFilename(
  input: string,
  range: { start: Date; end: Date },
): string {
  if (input === 'today') {
    return formatLocalDate(range.start);
  }
  if (input.includes(':')) {
    return `${formatLocalDate(range.start)}_${formatLocalDate(range.end)}`;
  }
  return input;
}

function formatSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

async function printDryRun(
  sessions: DiscoveredSession[],
  dateStr: string,
): Promise<void> {
  console.log();
  console.log(chalk.bold('OpenRecap - Dry Run'));
  console.log(`Date: ${dateStr}`);
  console.log();
  console.log(`Found ${chalk.bold(String(sessions.length))} sessions:`);
  console.log();

  // Table header
  const header = `  ${'#'.padStart(3)} │ ${'Project'.padEnd(34)} │ ${'Started'.padEnd(8)} │ ${'Size'.padEnd(9)} │ ${'Est. Tokens'.padEnd(11)} │ Cached`;
  const separator = `  ${'─'.repeat(3)}┼${'─'.repeat(36)}┼${'─'.repeat(10)}┼${'─'.repeat(11)}┼${'─'.repeat(13)}┼${'─'.repeat(7)}`;
  console.log(header);
  console.log(separator);

  let totalTokens = 0;
  let cachedCount = 0;

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];

    // Estimate tokens from file size (rough: ~0.25 tokens per byte after compression)
    const estTokens = Math.round(s.fileSize * 0.085);
    totalTokens += estTokens;

    // Check cache
    const cached = await getCached(s.sessionId, s.filePath);
    if (cached) cachedCount++;

    const time = s.startedAt.toTimeString().slice(0, 8);
    const project = s.cwd.replace(process.env.HOME || '', '~');
    const truncProject = project.length > 34 ? project.slice(0, 31) + '...' : project;

    console.log(
      `  ${String(i + 1).padStart(3)} │ ${truncProject.padEnd(34)} │ ${time} │ ${formatSize(s.fileSize).padEnd(9)} │ ${`~${estTokens.toLocaleString()}`.padEnd(11)} │ ${cached ? chalk.green('✓') : chalk.dim('✗')}`,
    );
  }

  console.log();
  console.log(
    `Total: ${sessions.length} sessions | ~${totalTokens.toLocaleString()} estimated tokens | ${cachedCount} cached`,
  );
  console.log();
}
