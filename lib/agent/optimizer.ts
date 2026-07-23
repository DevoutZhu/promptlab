/**
 * AI Agent Automatic Prompt Optimization Engine.
 *
 * Implements an Agentic Loop (Plan -> Execute -> Observe -> Reflect -> Improve)
 * that iteratively optimizes a prompt until it reaches a target quality score.
 *
 * Flow:
 *   1. Read current prompt as baseline
 *   2. Run one evaluation, record baseline score
 *   3. while (score < target && iterations < max) {
 *        a. LLM analyzes low-scoring causes and proposes an improvement strategy
 *        b. LLM generates new prompt content
 *        c. Save new version into PromptLab version history
 *        d. Evaluate the new version against quality dimensions
 *        e. If better -> set as new baseline
 *        f. Record iteration with strategy, thinking, and result
 *      }
 *   4. Return full optimization result
 *
 * Key design decisions:
 *   - Each iteration reuses `scorePrompt` (generate + evaluate) for fast scoring.
 *   - History of all iterations is fed to the optimizer LLM so it avoids
 *     repeating failed strategies.
 *   - Convergence detection: 3 consecutive rounds without >= 2% improvement
 *     triggers early exit.
 *   - Every generated version is persisted via the store's `updatePrompt`.
 */

import { getPrompt, getVersionHistory, updatePrompt } from "@/lib/db/store";
import { callLLM, checkApiKeys, LLMError } from "@/lib/llm/adapter";
import { evaluateResponse } from "@/lib/llm/eval";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Input goal describing what the optimizer should achieve. */
export interface OptimizationGoal {
  projectId: number;
  promptId: number;
  /** Target quality score (0-100). The loop stops when this is reached. */
  targetScore: number;
  /** Maximum number of optimization rounds (default 10). */
  maxIterations: number;
  /** Quality dimensions to evaluate on (default: 准确性, 完整性, 简洁性, 语气). */
  dimensions?: string[];
}

/** Full result returned after optimization completes or halts. */
export interface OptimizationResult {
  goal: OptimizationGoal;
  /** Per-round detail, in execution order. */
  iterations: OptimizationIteration[];
  /** The best prompt version found across all rounds. */
  winner: { version: number; score: number; content: string };
  /** Total rounds executed (may be less than maxIterations due to early exit). */
  totalIterations: number;
  /** Wall-clock duration in milliseconds. */
  duration: number;
  /** True if the target score was reached. */
  converged: boolean;
}

/** A single round of the Agentic Loop. */
export interface OptimizationIteration {
  round: number;
  /** The improvement strategy chosen by the LLM for this round. */
  strategy: string;
  /** The new prompt content generated this round. */
  newContent: string;
  /** The version number saved into PromptLab. */
  version: number;
  /** The quality score achieved by this version. */
  score: number;
  /** The LLM's reasoning / analysis for this round. */
  thinking: string;
}

// ---------------------------------------------------------------------------
// Template helpers (mirrors ab-engine for consistent variable handling)
// ---------------------------------------------------------------------------

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

function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    vars.add(match[1]);
  }
  return Array.from(vars);
}

function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    key in vars ? vars[key] : `{{${key}}}`
  );
}

// ---------------------------------------------------------------------------
// Single-prompt scoring
// ---------------------------------------------------------------------------

/**
 * Score a single prompt by:
 *   1. Filling template variables with test defaults.
 *   2. Calling the LLM to generate a response.
 *   3. Evaluating the response with LLM-as-judge.
 *
 * This is the "observe" step of the Agentic Loop — it tells us how good the
 * current prompt actually is.
 */
async function scorePrompt(
  promptContent: string,
  dimensions: string[]
): Promise<{ score: number; feedback: string }> {
  const varNames = extractVariables(promptContent);
  const testVars: Record<string, string> = {};
  for (const v of varNames) {
    testVars[v] = DEFAULT_TEST_VARS[v] ?? `[test_${v}]`;
  }
  const filledPrompt = fillTemplate(promptContent, testVars);

  const llmResult = await callLLM({ prompt: filledPrompt, temperature: 0.7 });
  const evalResult = await evaluateResponse(
    filledPrompt,
    llmResult.text,
    dimensions
  );

  return { score: evalResult.score, feedback: evalResult.feedback };
}

// ---------------------------------------------------------------------------
// Optimizer LLM prompt builder
// ---------------------------------------------------------------------------

/**
 * Build the system prompt sent to the optimizer LLM each round.
 *
 * The prompt includes:
 *   - The target score and evaluation dimensions.
 *   - The current best prompt content and its score.
 *   - The evaluator's feedback from the last scoring.
 *   - Full history of all previous iterations (strategy, score, thinking).
 *
 * This gives the optimizer context to propose genuinely new strategies instead
 * of repeating failed ones.
 */
function buildOptimizerSystemPrompt(
  currentContent: string,
  currentScore: number,
  targetScore: number,
  dimensions: string[],
  history: OptimizationIteration[],
  feedback: string
): string {
  const historyText =
    history.length > 0
      ? history
          .map(
            (h) =>
              `Round ${h.round}:\n` +
              `  Strategy: ${h.strategy}\n` +
              `  Score: ${h.score}\n` +
              `  Thinking: ${h.thinking}\n` +
              `  Generated prompt (truncated): ${h.newContent.slice(0, 300)}`
          )
          .join("\n\n")
      : "(No previous iterations — this is the first round)";

  return [
    "You are a world-class Prompt Engineering Optimization Expert.",
    "Your job is to iteratively improve a prompt so its quality score reaches the target.",
    "",
    `Target score: ${targetScore}`,
    `Evaluation dimensions: ${dimensions.join("、")}`,
    "",
    "--- Current best prompt ---",
    currentContent,
    "--- End prompt ---",
    "",
    `Current score: ${currentScore}`,
    `Last evaluation feedback: ${feedback}`,
    "",
    "--- History of previous improvement attempts ---",
    historyText,
    "--- End history ---",
    "",
    "Your task:",
    "1. Analyze what weaknesses cause the current score to fall short of the target.",
    "2. Choose a specific, concrete improvement strategy. Prefer strategies that",
    "   have NOT been tried before in the history above, unless you have a genuinely",
    "   different angle on them.",
    "3. Generate the complete improved prompt text.",
    "",
    "Available strategies to choose from (or invent your own descriptive name):",
    "- 简化表达: Make instructions shorter and clearer; remove redundant words.",
    "- 增加约束: Add specific constraints, boundaries, or formatting requirements.",
    "- 调整语气: Refine tone, style, or persona description.",
    "- 添加示例: Include concrete examples or few-shot demonstrations.",
    "- 结构化输出: Specify exact output format, structure, or JSON schema.",
    "- 角色强化: Strengthen and clarify the role/persona definition.",
    "- 分步指令: Break complex tasks into numbered step-by-step instructions.",
    "- 上下文增强: Add relevant background context or domain knowledge.",
    "- 负面示例: Show what NOT to do alongside positive examples.",
    "- 参数化: Make key attributes explicit as variables or options.",
    "",
    "CRITICAL RULES:",
    "- If the prompt contains {{variable}} placeholders, KEEP them unchanged.",
    "- The newPrompt field must contain the FULL prompt text, not a diff or summary.",
    "- Be bold — significant rewrites often yield the biggest score jumps.",
    "",
    "Output ONLY a JSON object (no markdown fences, no extra text):",
    "{",
    '  "thinking": "Detailed weakness analysis and reasoning for the chosen strategy",',
    '  "strategy": "Name of the strategy you used",',
    '  "newPrompt": "The complete, improved prompt text"',
    "}",
  ].join("\n");
}

/**
 * Parse the optimizer LLM's JSON response.
 *
 * Handles responses that may be wrapped in markdown code fences.
 * Falls back gracefully on parse failures.
 */
function parseOptimizerResponse(text: string): {
  thinking: string;
  strategy: string;
  newPrompt: string;
} {
  try {
    // Strip optional markdown fences
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in optimizer response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      thinking:
        typeof parsed.thinking === "string" && parsed.thinking.length > 0
          ? parsed.thinking
          : "LLM did not provide analysis.",
      strategy:
        typeof parsed.strategy === "string" && parsed.strategy.length > 0
          ? parsed.strategy
          : "未命名策略",
      newPrompt:
        typeof parsed.newPrompt === "string" && parsed.newPrompt.length > 0
          ? parsed.newPrompt
          : "",
    };
  } catch (err) {
    console.warn(
      "Failed to parse optimizer response, using fallback.\n" +
        "Raw text (first 500 chars): " +
        text.slice(0, 500)
    );
    return {
      thinking:
        "解析优化器响应失败。原始输出: " + text.slice(0, 300),
      strategy: "解析失败",
      newPrompt: "",
    };
  }
}

// ---------------------------------------------------------------------------
// Public API: optimizePrompt
// ---------------------------------------------------------------------------

/**
 * Run the full Agentic Loop to optimize a prompt.
 *
 * @param goal - Description of what to optimize and the target to reach.
 * @returns Complete optimization result with per-round details.
 *
 * @throws {LLMError} If no LLM API key is configured.
 * @throws {Error} If the prompt does not exist or belongs to a different project.
 *
 * @example
 *   const result = await optimizePrompt({
 *     projectId: 1,
 *     promptId: 1,
 *     targetScore: 90,
 *     maxIterations: 10,
 *   });
 *   console.log(result.winner.score, result.totalIterations);
 */
export async function optimizePrompt(
  goal: OptimizationGoal
): Promise<OptimizationResult> {
  const startTime = Date.now();
  const maxIterations = goal.maxIterations || 10;
  const targetScore = goal.targetScore;
  const dimensions = goal.dimensions ?? ["准确性", "完整性", "简洁性", "语气"];

  // ---- Guard: LLM API key ----
  const keys = checkApiKeys();
  if (!keys.openai && !keys.qwen) {
    throw new LLMError(
      "No LLM API key configured. Set OPENAI_API_KEY or DASHSCOPE_API_KEY.",
      "no_provider_available"
    );
  }

  // ---- Look up prompt ----
  const prompt = getPrompt(goal.promptId);
  if (!prompt) {
    throw new Error(`Prompt ${goal.promptId} not found`);
  }
  if (prompt.projectId !== goal.projectId) {
    throw new Error(
      `Prompt ${goal.promptId} does not belong to project ${goal.projectId}`
    );
  }

  // ---- Step 1 & 2: Baseline evaluation ----
  let baselineContent = prompt.content;
  let baselineScore: number;
  let baselineFeedback: string;

  try {
    const baselineEval = await scorePrompt(baselineContent, dimensions);
    baselineScore = baselineEval.score;
    baselineFeedback = baselineEval.feedback;
  } catch (err) {
    throw new Error(
      `Baseline evaluation failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let bestContent = baselineContent;
  let bestScore = baselineScore;
  let bestVersion = prompt.version;
  let currentFeedback = baselineFeedback;

  const iterations: OptimizationIteration[] = [];
  let converged = false;
  let stagnantRounds = 0;

  // ---- Step 3: Agentic Loop ----
  for (let round = 1; round <= maxIterations; round++) {
    console.log(
      `[Optimizer] Round ${round}/${maxIterations} — best score: ${bestScore}, target: ${targetScore}`
    );

    // --- 3a & 3b: LLM analyzes and generates improved prompt ---
    const systemPrompt = buildOptimizerSystemPrompt(
      baselineContent,
      bestScore,
      targetScore,
      dimensions,
      iterations,
      currentFeedback
    );

    let thinking: string;
    let strategy: string;
    let newContent: string;

    try {
      const optimizerResult = await callLLM({
        prompt:
          "Analyze the current prompt and propose an improved version to reach the target score.",
        systemPrompt,
        temperature: 0.8,
        maxTokens: 2048,
      });

      const parsed = parseOptimizerResponse(optimizerResult.text);
      thinking = parsed.thinking;
      strategy = parsed.strategy;
      newContent = parsed.newPrompt;
    } catch (err) {
      console.error(
        `[Optimizer] LLM call failed at round ${round}:`,
        err
      );
      // If the optimizer LLM fails, we cannot continue meaningfully.
      break;
    }

    // Skip round if the optimizer produced an empty prompt.
    if (!newContent || newContent.trim().length === 0) {
      console.warn(
        `[Optimizer] Round ${round} produced empty content — skipping.`
      );
      stagnantRounds++;
      if (stagnantRounds >= 3) break;
      continue;
    }

    // --- 3c: Save new version into PromptLab ---
    let savedVersion: number;
    try {
      const saved = updatePrompt(goal.promptId, newContent);
      if (!saved) {
        throw new Error("updatePrompt returned null");
      }
      savedVersion = saved.version;
      console.log(
        `[Optimizer] Round ${round} saved version ${savedVersion}: "${strategy}"`
      );
    } catch (err) {
      console.error(
        `[Optimizer] Failed to save version at round ${round}:`,
        err
      );
      stagnantRounds++;
      if (stagnantRounds >= 3) break;
      continue;
    }

    // --- 3d & 3e: Score the new version ---
    let newScore: number;
    let newFeedback: string;

    try {
      const evalResult = await scorePrompt(newContent, dimensions);
      newScore = evalResult.score;
      newFeedback = evalResult.feedback;
    } catch (err) {
      console.error(
        `[Optimizer] Evaluation failed at round ${round}:`,
        err
      );
      // Record the iteration with a zero score so history is preserved.
      iterations.push({
        round,
        strategy,
        newContent,
        version: savedVersion,
        score: 0,
        thinking: thinking + "\n\n(评估失败: " +
          (err instanceof Error ? err.message : String(err)) +
          ")",
      });
      stagnantRounds++;
      if (stagnantRounds >= 3) break;
      continue;
    }

    // --- 3f: Update baseline if better ---
    const improved = newScore > bestScore;
    if (improved) {
      // Check if improvement is significant (>= 2%).
      const pctImprovement =
        bestScore > 0 ? ((newScore - bestScore) / bestScore) * 100 : 0;
      if (pctImprovement >= 2) {
        stagnantRounds = 0;
      } else {
        stagnantRounds++;
      }

      baselineContent = newContent;
      bestScore = newScore;
      bestVersion = savedVersion;
      bestContent = newContent;
      currentFeedback = newFeedback;

      console.log(
        `[Optimizer] Round ${round} IMPROVED: ${bestScore} (+${pctImprovement.toFixed(1)}%)`
      );
    } else {
      stagnantRounds++;
      console.log(
        `[Optimizer] Round ${round} no improvement: ${newScore} (best: ${bestScore})`
      );
    }

    // --- 3g: Record iteration ---
    iterations.push({
      round,
      strategy,
      newContent,
      version: savedVersion,
      score: newScore,
      thinking,
    });

    // --- Target reached? ---
    if (bestScore >= targetScore) {
      converged = true;
      console.log(
        `[Optimizer] Target reached at round ${round}! Score: ${bestScore}`
      );
      break;
    }

    // --- Convergence detection: 3 consecutive rounds without >= 2% improvement ---
    if (stagnantRounds >= 3) {
      console.log(
        `[Optimizer] Converged at round ${round}: ${stagnantRounds} stagnant rounds.`
      );
      break;
    }
  }

  // ---- Step 4: Build result ----
  const duration = Date.now() - startTime;

  console.log(
    `[Optimizer] Done in ${duration}ms — ${iterations.length} rounds, ` +
      `best score: ${bestScore}, converged: ${converged}`
  );

  return {
    goal,
    iterations,
    winner: {
      version: bestVersion,
      score: bestScore,
      content: bestContent,
    },
    totalIterations: iterations.length,
    duration,
    converged,
  };
}
