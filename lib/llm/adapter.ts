/**
 * LLM Adapter — Unified interface for OpenAI and Tongyi Qianwen (DashScope).
 *
 * Environment variables:
 *   OPENAI_API_KEY          — OpenAI API key
 *   OPENAI_BASE_URL         — OpenAI base URL (default: https://api.openai.com/v1)
 *   DASHSCOPE_API_KEY       — Tongyi Qianwen (DashScope) API key
 *
 * Usage:
 *   const result = await callLLM({ prompt: "你好", provider: "auto" });
 *   // { text: "...", model: "qwen-turbo", usage: { promptTokens: 10, completionTokens: 25 } }
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";

/** DashScope uses an OpenAI-compatible endpoint. */
const DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";
const DEFAULT_QWEN_MODEL = "qwen-turbo";
const DEFAULT_TIMEOUT_MS = 60000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = "openai" | "qwen" | "auto";

export interface CallLLMOptions {
  /** Model name (default: gpt-4o-mini for OpenAI, qwen-turbo for Qwen). */
  model?: string;
  /** The user prompt text. */
  prompt: string;
  /** Optional system prompt. */
  systemPrompt?: string;
  /** Sampling temperature (0-2), default 0. */
  temperature?: number;
  /** Maximum tokens in the response, default 1024. */
  maxTokens?: number;
  /** Provider selection: "openai" | "qwen" | "auto" (auto-detect from available keys). */
  provider?: Provider;
  /** Request timeout in milliseconds, default 60000. */
  timeoutMs?: number;
}

export interface LLMResponse {
  /** The generated text. */
  text: string;
  /** The model that produced the response. */
  model: string;
  /** Token usage breakdown. */
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_api_key"
      | "timeout"
      | "api_error"
      | "network_error"
      | "no_provider_available"
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

interface ResolvedProvider {
  provider: "openai" | "qwen";
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

/**
 * Resolve the provider from the options, auto-detecting if "auto" is specified.
 * Auto-detection priority: if both keys are set, OpenAI takes precedence.
 */
function resolveProvider(provider: Provider): ResolvedProvider {
  const openaiAvailable = OPENAI_API_KEY.length > 0;
  const qwenAvailable = DASHSCOPE_API_KEY.length > 0;

  if (provider === "openai") {
    if (!openaiAvailable) {
      throw new LLMError(
        "OPENAI_API_KEY is not set. Please configure it in your environment.",
        "missing_api_key"
      );
    }
    const isDeepSeek = OPENAI_BASE_URL.includes("deepseek");
    return {
      provider: "openai",
      apiKey: OPENAI_API_KEY,
      baseUrl: OPENAI_BASE_URL,
      defaultModel: isDeepSeek ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_OPENAI_MODEL,
    };
  }

  if (provider === "qwen") {
    if (!qwenAvailable) {
      throw new LLMError(
        "DASHSCOPE_API_KEY is not set. Please configure it in your environment.",
        "missing_api_key"
      );
    }
    return {
      provider: "qwen",
      apiKey: DASHSCOPE_API_KEY,
      baseUrl: DASHSCOPE_BASE_URL,
      defaultModel: DEFAULT_QWEN_MODEL,
    };
  }

  // "auto" — detect from available keys
  if (openaiAvailable) {
    const isDeepSeek = OPENAI_BASE_URL.includes("deepseek");
    return {
      provider: "openai",
      apiKey: OPENAI_API_KEY,
      baseUrl: OPENAI_BASE_URL,
      defaultModel: isDeepSeek ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_OPENAI_MODEL,
    };
  }

  if (qwenAvailable) {
    return {
      provider: "qwen",
      apiKey: DASHSCOPE_API_KEY,
      baseUrl: DASHSCOPE_BASE_URL,
      defaultModel: DEFAULT_QWEN_MODEL,
    };
  }

  throw new LLMError(
    "No LLM API key configured. Set OPENAI_API_KEY or DASHSCOPE_API_KEY to enable LLM features.",
    "no_provider_available"
  );
}

// ---------------------------------------------------------------------------
// Key availability check
// ---------------------------------------------------------------------------

export interface KeyStatus {
  openai: boolean;
  qwen: boolean;
}

/** Check which providers have API keys configured. */
export function checkApiKeys(): KeyStatus {
  return {
    openai: OPENAI_API_KEY.length > 0,
    qwen: DASHSCOPE_API_KEY.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Core LLM call
// ---------------------------------------------------------------------------

/**
 * Call an LLM with a unified interface across OpenAI and DashScope.
 *
 * @example
 *   // Auto-detect provider
 *   const res = await callLLM({ prompt: "Hello", provider: "auto" });
 *
 * @example
 *   // Explicit provider
 *   const res = await callLLM({ prompt: "你好", provider: "qwen", model: "qwen-plus" });
 */
export async function callLLM(options: CallLLMOptions): Promise<LLMResponse> {
  const {
    prompt,
    systemPrompt,
    temperature = 0,
    maxTokens = 1024,
    provider: providerOption = "auto",
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const resolved = resolveProvider(providerOption);
  const model = options.model || resolved.defaultModel;

  // Build messages array
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${resolved.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {
        errorBody = "(could not read error body)";
      }
      throw new LLMError(
        `[${resolved.provider}] API returned HTTP ${response.status}: ${errorBody}`,
        "api_error"
      );
    }

    const data = await response.json();

    const content: string | undefined = data.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
      throw new LLMError(
        `[${resolved.provider}] API returned an unexpected response structure`,
        "api_error"
      );
    }

    // Extract token usage (both OpenAI and DashScope provide this in the same shape)
    const usage = {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
    };

    return {
      text: content,
      model: data.model || model,
      usage,
    };
  } catch (error) {
    // Re-throw our own LLMError instances as-is
    if (error instanceof LLMError) {
      throw error;
    }

    // Detect AbortController timeout (works in both Node.js and browser)
    if (error instanceof Error && error.name === "AbortError") {
      throw new LLMError(
        `[${resolved.provider}] LLM call timed out after ${timeoutMs}ms`,
        "timeout"
      );
    }

    throw new LLMError(
      `[${resolved.provider}] LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
      "network_error"
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
