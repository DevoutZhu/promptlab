/**
 * A/B Experiment Engine
 *
 * Runs experiments by calling an LLM with both baseline and candidate prompt
 * versions, then evaluating the responses using an LLM judge.  Results are
 * averaged over multiple iterations to reduce variance.
 */

import {
  getExperiment,
  updateExperiment,
  getPrompt,
  getVersionHistory,
  createEvaluation,
  getEvaluations,
} from "@/lib/db/store";

import { callLLM, checkApiKeys, LLMError } from "@/lib/llm/adapter";
import { evaluateResponse } from "@/lib/llm/eval";

// Inline types (legacy types.ts deleted)
interface Experiment {
  id: number; promptId: number; name: string;
  baselineVersion: number; candidateVersion: number;
  status: "draft" | "running" | "completed";
  results: string | null; createdAt: string;
}
interface ExperimentResults {
  baselineScore: number; candidateScore: number;
  winner: "baseline" | "candidate" | "tie";
  comparisons: ComparisonItem[];
}
interface ComparisonItem {
  metric: string; baseline: number; candidate: number; difference: number;
}
interface Evaluation {
  id: number; experimentId: number; score: number;
  metrics: string; createdAt: string;
}

// ---------------------------------------------------------------------------
// Default test variables
// ---------------------------------------------------------------------------
// When a prompt template contains `{{variable}}` placeholders, we substitute
// them with these defaults so the LLM has concrete input to work with.

const DEFAULT_TEST_VARS: Record<string, string> = {
  company_name: "Acme Corp",
  tone: "friendly",
  customer_name: "Alice",
  topic: "artificial intelligence",
  audience: "technical professionals",
  platform: "Twitter",
  max_length: "280",
  language: "TypeScript",
  code: 'function hello() {\n  console.log("Hello, world!");\n}',
};

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/**
 * Extract `{{variable}}` names from a Mustache-style template string.
 */
function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

/**
 * Replace `{{variable}}` placeholders with values from the given map.
 * Placeholders without a mapping are left unchanged.
 */
function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in vars ? vars[key] : `{{${key}}}`
  );
}

// ---------------------------------------------------------------------------
// Single evaluation run
// ---------------------------------------------------------------------------

interface SingleRunResult {
  baselineScore: number;
  candidateScore: number;
  baselineResponse: string;
  candidateResponse: string;
}

/**
 * Execute one evaluation iteration: send both prompts to the LLM, then
 * evaluate both responses.
 */
async function runSingleEval(
  baselineContent: string,
  candidateContent: string,
  testVars: Record<string, string>
): Promise<SingleRunResult> {
  const filledBaseline = fillTemplate(baselineContent, testVars);
  const filledCandidate = fillTemplate(candidateContent, testVars);

  // Call LLM with both prompts in parallel.
  const [baselineResult, candidateResult] = await Promise.all([
    callLLM({ prompt: filledBaseline, temperature: 0.7 }),
    callLLM({ prompt: filledCandidate, temperature: 0.7 }),
  ]);

  const baselineText = baselineResult.text;
  const candidateText = candidateResult.text;

  // Evaluate both responses in parallel.
  const [baselineEval, candidateEval] = await Promise.all([
    evaluateResponse(filledBaseline, baselineText),
    evaluateResponse(filledCandidate, candidateText),
  ]);

  return {
    baselineScore: baselineEval.score,
    candidateScore: candidateEval.score,
    baselineResponse: baselineText,
    candidateResponse: candidateText,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run an A/B experiment using real LLM calls.
 *
 * 1. Validates that the LLM API key is configured.
 * 2. Locates both prompt versions from the version history.
 * 3. Builds test variable values to fill template placeholders.
 * 4. Runs `iterations` (default 5) evaluation rounds.
 * 5. Averages scores, determines a winner, and persists results.
 *
 * @param id          - The experiment ID.
 * @param iterations  - Number of evaluation rounds (default 5).
 * @returns The updated experiment record with results.
 */
export async function runExperiment(
  id: number,
  iterations: number = 5
): Promise<Experiment> {
  // ---- API key guard ----
  const keys = checkApiKeys();
  if (!keys.openai && !keys.qwen) {
    throw new LLMError(
      "No LLM API key configured. Set OPENAI_API_KEY or DASHSCOPE_API_KEY in your .env.local file to enable LLM evaluation.",
      "no_provider_available"
    );
  }

  // ---- Look up experiment ----
  const exp = getExperiment(id);
  if (!exp) {
    throw new Error(`Experiment ${id} not found`);
  }

  if (exp.status === "running") {
    throw new Error(`Experiment ${id} is already running`);
  }

  // ---- Transition to running ----
  updateExperiment(id, "running");

  try {
    // ---- Locate prompt versions ----
    const basePrompt = getPrompt(exp.promptId);
    if (!basePrompt) {
      throw new Error(`Prompt ${exp.promptId} not found`);
    }

    const versions = getVersionHistory(exp.promptId);
    const baselineRow = versions.find(
      (v) => v.version === exp.baselineVersion
    );
    const candidateRow = versions.find(
      (v) => v.version === exp.candidateVersion
    );

    if (!baselineRow) {
      throw new Error(
        `Baseline version ${exp.baselineVersion} not found for prompt "${basePrompt.name}"`
      );
    }
    if (!candidateRow) {
      throw new Error(
        `Candidate version ${exp.candidateVersion} not found for prompt "${basePrompt.name}"`
      );
    }

    // ---- Build test variable map ----
    const baseVars = extractVariables(baselineRow.content);
    const candVars = extractVariables(candidateRow.content);
    const allVarNames = [...new Set([...baseVars, ...candVars])];

    const testVars: Record<string, string> = {};
    for (const v of allVarNames) {
      testVars[v] = DEFAULT_TEST_VARS[v] ?? `[test_${v}]`;
    }

    if (allVarNames.length > 0) {
      console.log(
        `🔧 Test variables for experiment ${id}:`,
        JSON.stringify(testVars)
      );
    }

    // ---- Run iterations ----
    const allBaselineScores: number[] = [];
    const allCandidateScores: number[] = [];

    for (let i = 0; i < iterations; i++) {
      console.log(`  ▶  Iteration ${i + 1}/${iterations}...`);
      const result = await runSingleEval(
        baselineRow.content,
        candidateRow.content,
        testVars
      );
      allBaselineScores.push(result.baselineScore);
      allCandidateScores.push(result.candidateScore);
    }

    // ---- Aggregate results ----
    const avgBaseline = round2(mean(allBaselineScores));
    const avgCandidate = round2(mean(allCandidateScores));

    const winner: ExperimentResults["winner"] =
      avgCandidate > avgBaseline
        ? "candidate"
        : avgBaseline > avgCandidate
          ? "baseline"
          : "tie";

    const comparisons: ComparisonItem[] = [
      {
        metric: "overall_score",
        baseline: avgBaseline,
        candidate: avgCandidate,
        difference: round2(avgCandidate - avgBaseline),
      },
      {
        metric: "score_stddev",
        baseline: round2(stddev(allBaselineScores)),
        candidate: round2(stddev(allCandidateScores)),
        difference: round2(
          stddev(allCandidateScores) - stddev(allBaselineScores)
        ),
      },
      {
        metric: "iterations",
        baseline: iterations,
        candidate: iterations,
        difference: 0,
      },
    ];

    const results: ExperimentResults = {
      baselineScore: avgBaseline,
      candidateScore: avgCandidate,
      winner,
      comparisons,
    };

    // ---- Persist results ----
    updateExperiment(id, "completed", JSON.stringify(results));

    // Store per-iteration evaluation records.
    for (let i = 0; i < iterations; i++) {
      createEvaluation({
        experimentId: id,
        score: round2(allCandidateScores[i] - allBaselineScores[i]),
        metrics: {
          iteration: i + 1,
          baselineScore: allBaselineScores[i],
          candidateScore: allCandidateScores[i],
        },
      });
    }

    console.log(
      `✅ Experiment ${id} completed: baseline=${avgBaseline}, candidate=${avgCandidate}, winner=${winner}`
    );

    return getExperimentResults(id);
  } catch (err) {
    // On any failure, revert to draft so the user can retry.
    console.error(`❌ Experiment ${id} failed:`, err);
    updateExperiment(id, "draft");

    // Re-throw LLMError instances so the API can return proper error details.
    if (err instanceof LLMError) {
      throw err;
    }
    throw new Error(
      `Experiment failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Return a single experiment with its current state.
 */
export function getExperimentResults(id: number): Experiment {
  const exp = getExperiment(id);
  if (!exp) {
    throw new Error(`Experiment ${id} not found`);
  }

  return {
    id: exp.id,
    promptId: exp.promptId,
    name: exp.name,
    baselineVersion: exp.baselineVersion,
    candidateVersion: exp.candidateVersion,
    status: exp.status as Experiment["status"],
    results: exp.results
      ? (JSON.parse(exp.results) as ExperimentResults)
      : null,
    createdAt: exp.createdAt,
  };
}

/**
 * Return all evaluations belonging to an experiment.
 */
export function listEvaluations(experimentId: number): Evaluation[] {
  const rows = getEvaluations(experimentId);
  return rows.map((row) => ({
    id: row.id,
    experimentId: row.experimentId,
    score: row.score,
    metrics: row.metrics
      ? (JSON.parse(row.metrics) as Record<string, unknown>)
      : null,
    createdAt: row.createdAt,
  }));
}

/**
 * Return the full experiment together with its child evaluations.
 */
export function getExperimentDetail(
  id: number
): Experiment & { evaluations: Evaluation[] } {
  const experiment = getExperimentResults(id);
  const evals = listEvaluations(id);
  return { ...experiment, evaluations: evals };
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
