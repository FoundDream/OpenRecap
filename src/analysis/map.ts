import { generateObject } from "ai";
import { getCached, setCache } from "../cache/cache.js";
import { sanitize } from "../privacy/sanitizer.js";
import { compressSession } from "../session/compress.js";
import { parseSession } from "../session/parser.js";
import type {
  Config,
  DiscoveredSession,
  MapResult,
  SessionAnalysis,
} from "../types.js";
import { sessionAnalysisSchema } from "../types.js";
import { log, spinner } from "../utils/logger.js";
import { createModel } from "./llm.js";
import { buildMapUserPrompt, MAP_SYSTEM_PROMPT } from "./prompts.js";

/**
 * Run concurrent tasks with a concurrency limit.
 */
async function withConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const executing: Promise<void>[] = [];
  for (const item of items) {
    const p = fn(item).then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

/**
 * Retry an async function with exponential backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  baseDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (i < retries) {
        const delay = baseDelayMs * 2 ** i;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Analyze a single session chunk with LLM.
 */
async function analyzeChunk(
  model: ReturnType<typeof createModel>,
  chunk: string,
  project: string,
): Promise<SessionAnalysis> {
  const result = await generateObject({
    model,
    schema: sessionAnalysisSchema,
    system: MAP_SYSTEM_PROMPT,
    prompt: buildMapUserPrompt(chunk, project),
  });
  return result.object;
}

/**
 * Merge multiple SessionAnalysis results (from chunked sessions).
 */
function mergeAnalyses(analyses: SessionAnalysis[]): SessionAnalysis {
  if (analyses.length === 1) return analyses[0];

  return {
    sessionSummary: analyses.map((a) => a.sessionSummary).join(" "),
    language: analyses[0].language,
    knowledgePoints: analyses.flatMap((a) => a.knowledgePoints),
    practicalTips: analyses.flatMap((a) => a.practicalTips),
    problemsAndSolutions: analyses.flatMap((a) => a.problemsAndSolutions),
    technologies: [...new Set(analyses.flatMap((a) => a.technologies))],
  };
}

/**
 * Map phase: analyze all sessions concurrently.
 * Returns results for successful sessions; logs errors for failures.
 */
export async function mapAllSessions(
  sessions: DiscoveredSession[],
  config: Config,
  options: { noCache: boolean; concurrency: number },
): Promise<MapResult[]> {
  const model = createModel(config);
  const results: MapResult[] = [];
  const errors: { session: DiscoveredSession; error: unknown }[] = [];
  let completed = 0;

  const spin = spinner(`Analyzing sessions (0/${sessions.length})...`);

  await withConcurrency(sessions, options.concurrency, async (session) => {
    try {
      // Check cache
      if (!options.noCache) {
        const cached = await getCached(session.sessionId, session.filePath);
        if (cached) {
          results.push({
            sessionId: session.sessionId,
            cwd: session.cwd,
            analysis: cached,
          });
          completed++;
          spin.text = `Analyzing sessions (${completed}/${sessions.length})...`;
          return;
        }
      }

      // Parse → compress → sanitize
      const parsed = parseSession(session.filePath);
      if (parsed.length === 0) {
        completed++;
        spin.text = `Analyzing sessions (${completed}/${sessions.length})...`;
        return;
      }

      const chunks = compressSession(parsed);
      const sanitizedChunks = chunks.map((c) => sanitize(c).text);

      // Analyze each chunk (most sessions will have 1 chunk)
      const chunkResults: SessionAnalysis[] = [];
      for (const chunk of sanitizedChunks) {
        const analysis = await withRetry(
          () => analyzeChunk(model, chunk, session.cwd),
          2, // retries for rate limit
          2000, // base delay 2s
        );
        chunkResults.push(analysis);
      }

      const merged = mergeAnalyses(chunkResults);

      // Cache the result
      await setCache(session.sessionId, session.filePath, merged);

      results.push({
        sessionId: session.sessionId,
        cwd: session.cwd,
        analysis: merged,
      });
    } catch (e) {
      errors.push({ session, error: e });
    }

    completed++;
    spin.text = `Analyzing sessions (${completed}/${sessions.length})...`;
  });

  spin.succeed(`Analyzed ${results.length}/${sessions.length} sessions.`);

  for (const { session, error } of errors) {
    log.warn(`Failed to analyze session ${session.sessionId}: ${error}`);
  }

  return results;
}
