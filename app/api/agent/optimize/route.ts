import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSeed, getPrompt } from "@/lib/db/store";
import { optimizePrompt } from "@/lib/agent/optimizer";
import { LLMError } from "@/lib/llm/adapter";
import type { OptimizationGoal } from "@/lib/agent/optimizer";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const OptimizeSchema = z.object({
  projectId: z
    .number()
    .int()
    .positive("projectId must be a positive integer"),
  promptId: z
    .number()
    .int()
    .positive("promptId must be a positive integer"),
  targetScore: z
    .number()
    .min(1, "targetScore must be at least 1")
    .max(100, "targetScore must be at most 100"),
  maxIterations: z
    .number()
    .int()
    .min(1, "maxIterations must be at least 1")
    .max(50, "maxIterations must be at most 50")
    .default(10),
  dimensions: z
    .array(z.string().min(1))
    .min(1, "At least one dimension is required")
    .default(["准确性", "完整性", "简洁性", "语气"]),
});

// ---------------------------------------------------------------------------
// POST /api/agent/optimize
// ---------------------------------------------------------------------------
//
// Body (JSON):
//   {
//     "projectId": 1,
//     "promptId": 1,
//     "targetScore": 90,
//     "maxIterations": 10,       // optional, default 10
//     "dimensions": ["准确性", ...] // optional, default all four
//   }
//
// Response (200):
//   {
//     "goal": { ... },
//     "iterations": [ { "round": 1, "strategy": "...", "score": 85, ... } ],
//     "winner": { "version": 3, "score": 91, "content": "..." },
//     "totalIterations": 3,
//     "duration": 12345,
//     "converged": true
//   }
//
// The Agentic Loop runs synchronously inside this request. Long-running
// optimizations may hit Vercel/Edge function timeouts; for production use
// with large maxIterations, consider a background-job queue.

export async function POST(request: NextRequest) {
  ensureSeed();

  // ---- Parse & validate body ----
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const parsed = OptimizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { projectId, promptId, targetScore, maxIterations, dimensions } =
    parsed.data;

  // ---- Verify prompt exists ----
  const prompt = getPrompt(promptId);
  if (!prompt) {
    return NextResponse.json(
      { error: `Prompt ${promptId} not found` },
      { status: 404 }
    );
  }

  if (prompt.projectId !== projectId) {
    return NextResponse.json(
      {
        error: `Prompt ${promptId} does not belong to project ${projectId}`,
      },
      { status: 400 }
    );
  }

  // ---- Build goal ----
  const goal: OptimizationGoal = {
    projectId,
    promptId,
    targetScore,
    maxIterations,
    dimensions,
  };

  // ---- Run Agentic Loop ----
  try {
    const result = await optimizePrompt(goal);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[API] Agent optimization failed:", error);

    if (error instanceof LLMError) {
      const statusCode =
        error.code === "missing_api_key" ||
        error.code === "no_provider_available"
          ? 400
          : 502;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error:
          "Optimization failed: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
