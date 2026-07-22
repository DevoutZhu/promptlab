/**
 * LLM-as-Judge Response Evaluator.
 *
 * Uses an LLM to score AI-generated responses on configurable quality dimensions.
 * Supports single-response and batch evaluation with custom criteria.
 *
 * Default criteria: 准确性, 完整性, 简洁性, 语气
 */

import { callLLM, type Provider } from "./adapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvalSingleResult {
  /** Overall quality score (0-100). */
  score: number;
  /** Human-readable explanation of the score. */
  feedback: string;
}

export interface EvalPair {
  prompt: string;
  response: string;
}

export interface EvalBatchResult {
  /** Individual evaluations for each pair. */
  items: EvalSingleResult[];
  /** Average score across all pairs. */
  averageScore: number;
  /** Number of pairs evaluated. */
  total: number;
}

/**
 * @deprecated Use `EvalSingleResult` instead. Kept for backward compatibility
 * with code that imports `EvalResult`.
 */
export type EvalResult = EvalSingleResult;

// ---------------------------------------------------------------------------
// Default criteria (Chinese)
// ---------------------------------------------------------------------------

const DEFAULT_CRITERIA = ["准确性", "完整性", "简洁性", "语气"];

const CRITERIA_DESCRIPTIONS: Record<string, string> = {
  "准确性": "回答是否准确无误地回应了提示词的要求，信息是否正确",
  "完整性": "回答是否全面覆盖了提示词的所有要点，是否有遗漏",
  "简洁性": "回答是否言简意赅，没有冗余或无关内容",
  "语气": "回答的语气风格是否恰当，是否符合预期场景",
};

// ---------------------------------------------------------------------------
// Judge prompt builder
// ---------------------------------------------------------------------------

function buildJudgeSystemPrompt(criteria: string[]): string {
  const criteriaList = criteria
    .map((c, i) => {
      const desc = CRITERIA_DESCRIPTIONS[c] || `对"${c}"维度的评价`;
      return `${i + 1}. **${c}** (0-100): ${desc}`;
    })
    .join("\n");

  const criteriaKeys = criteria
    .map((c) => `    "${c}": <number 0-100>`)
    .join(",\n");

  return [
    "你是一个专业的 AI 回答质量评估专家。",
    "你的任务是评估 AI 生成的回答，按照以下维度打分（每个维度 0-100 分）：",
    "",
    criteriaList,
    "",
    "请以 JSON 格式输出评估结果，不要输出其他内容：",
    "{",
    criteriaKeys + ",",
    '    "overall": <number 0-100>,',
    '    "feedback": "<一句话中文反馈，说明主要优点或不足>"',
    "}",
    "",
    "\"overall\" 分数必须是各项得分的算术平均值（四舍五入到整数）。",
  ].join("\n");
}

function buildJudgeUserMessage(
  promptContent: string,
  response: string,
  criteria: string[]
): string {
  const criteriaLabel = criteria.join("、");
  return [
    `请评估以下 AI 回答在【${criteriaLabel}】这些维度上的表现。`,
    "",
    "--- 提示词 ---",
    promptContent,
    "",
    "--- AI 回答 ---",
    response,
    "",
    "--- 请输出 JSON 评估结果 ---",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

interface RawEvalScores {
  overall: number;
  feedback: string;
  [criterion: string]: unknown;
}

function parseEvalResponse(text: string): EvalSingleResult {
  try {
    // Extract JSON object from the response (may be wrapped in markdown fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in evaluation response");
    }

    const raw = JSON.parse(jsonMatch[0]) as RawEvalScores;

    const score = clampScore(Number(raw.overall));
    const feedback =
      typeof raw.feedback === "string" && raw.feedback.length > 0
        ? raw.feedback
        : "未提供反馈";

    return { score, feedback };
  } catch {
    // Graceful fallback: return neutral score instead of crashing the experiment
    console.warn(
      "Failed to parse evaluation response, returning neutral score.\n" +
        "Raw eval text: " +
        text.slice(0, 300)
    );

    return {
      score: 50,
      feedback: "评估解析失败，返回中性分数。原始响应: " + text.slice(0, 200),
    };
  }
}

// ---------------------------------------------------------------------------
// Core: single evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single prompt-response pair using LLM-as-judge.
 *
 * @param promptContent - The prompt text that produced the response.
 * @param response      - The AI-generated response to evaluate.
 * @param criteria      - Quality dimensions to score on (default: 准确性, 完整性, 简洁性, 语气).
 * @returns Evaluation result with 0-100 score and feedback.
 *
 * @example
 *   // Use default criteria
 *   const result = await evaluateResponse("翻译: Hello", "你好");
 *   console.log(result.score, result.feedback);
 *
 * @example
 *   // Custom criteria
 *   const result = await evaluateResponse(
 *     "写一首诗",
 *     "春眠不觉晓",
 *     ["创意性", "押韵", "意境"]
 *   );
 */
export async function evaluateResponse(
  promptContent: string,
  response: string,
  criteria: string[] = DEFAULT_CRITERIA
): Promise<EvalSingleResult> {
  const systemPrompt = buildJudgeSystemPrompt(criteria);
  const userMessage = buildJudgeUserMessage(promptContent, response, criteria);

  const result = await callLLM({
    prompt: userMessage,
    systemPrompt,
    temperature: 0.1, // Low temperature for consistent scoring
    maxTokens: 512,
  });

  return parseEvalResponse(result.text);
}

// ---------------------------------------------------------------------------
// Core: batch evaluation
// ---------------------------------------------------------------------------

/** Options for batch evaluation. */
export interface EvalBatchOptions {
  /** Quality dimensions to score on (default: 准确性, 完整性, 简洁性, 语气). */
  criteria?: string[];
  /**
   * Maximum concurrency for parallel evaluation.
   * Default 1 (sequential). Set higher if your API rate limit allows it.
   */
  concurrency?: number;
  /**
   * Override the LLM provider for the judge calls.
   * Useful when you want to use a different model for evaluation.
   */
  provider?: Provider;
}

/**
 * Evaluate multiple prompt-response pairs.
 *
 * @param pairs   - Array of { prompt, response } objects.
 * @param options - Batch options (criteria, concurrency, provider override).
 * @returns Batch result with individual scores, average, and total count.
 *
 * @example
 *   const result = await evaluateBatch([
 *     { prompt: "你好", response: "你好！有什么可以帮助你的？" },
 *     { prompt: "1+1=?", response: "等于2" },
 *   ]);
 *   console.log(result.averageScore);
 */
export async function evaluateBatch(
  pairs: EvalPair[],
  options: EvalBatchOptions = {}
): Promise<EvalBatchResult> {
  const { criteria = DEFAULT_CRITERIA, concurrency = 1, provider } = options;

  if (pairs.length === 0) {
    return { items: [], averageScore: 0, total: 0 };
  }

  const results: EvalSingleResult[] = [];

  // Process in chunks to respect concurrency limit
  for (let i = 0; i < pairs.length; i += concurrency) {
    const chunk = pairs.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((pair) => {
        const systemPrompt = buildJudgeSystemPrompt(criteria);
        const userMessage = buildJudgeUserMessage(pair.prompt, pair.response, criteria);

        return callLLM({
          prompt: userMessage,
          systemPrompt,
          temperature: 0.1,
          maxTokens: 512,
          ...(provider ? { provider } : {}),
        }).then((r) => parseEvalResponse(r.text));
      })
    );
    results.push(...chunkResults);
  }

  const total = results.length;
  const averageScore =
    total > 0
      ? Math.round(
          (results.reduce((sum, r) => sum + r.score, 0) / total) * 10
        ) / 10
      : 0;

  return { items: results, averageScore, total };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
