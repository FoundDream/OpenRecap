import { generateObject } from 'ai';
import type { Config, MapResult, Report } from '../types.js';
import { reportSchema } from '../types.js';
import { createModel } from './llm.js';
import { REDUCE_SYSTEM_PROMPT, buildReduceUserPrompt } from './prompts.js';
import { spinner } from '../utils/logger.js';

/**
 * Reduce phase: consolidate all session analyses into a single report.
 */
export async function reduceAnalyses(
  mapResults: MapResult[],
  config: Config,
): Promise<Report> {
  const model = createModel(config);
  const spin = spinner('Generating consolidated report...');

  try {
    const sessionInputs = mapResults.map((r) => ({
      project: r.projectPath,
      analysis: JSON.stringify(r.analysis, null, 2),
    }));

    const result = await generateObject({
      model,
      schema: reportSchema,
      system: REDUCE_SYSTEM_PROMPT,
      prompt: buildReduceUserPrompt(sessionInputs),
    });

    spin.succeed('Report generated.');
    return result.object;
  } catch (e) {
    spin.fail('Failed to generate report.');

    // Fallback: construct a basic report from map results
    const fallback: Report = {
      title: 'Daily Learning Report',
      overview: {
        totalSessions: mapResults.length,
        sessionSummaries: mapResults.map((r) => ({
          project: r.projectPath,
          summary: r.analysis.sessionSummary,
        })),
        projectsInvolved: [...new Set(mapResults.map((r) => r.projectPath))],
      },
      knowledgeCards: mapResults.flatMap((r) =>
        r.analysis.knowledgePoints.map((kp) => ({
          ...kp,
          tags: r.analysis.technologies,
        })),
      ),
      practicalTips: mapResults.flatMap((r) =>
        r.analysis.practicalTips.map((tip) => ({
          ...tip,
          sourceProject: r.projectPath,
        })),
      ),
      problemsAndSolutions: mapResults.flatMap(
        (r) => r.analysis.problemsAndSolutions,
      ),
      furtherLearning: [],
    };

    return fallback;
  }
}
