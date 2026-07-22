import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getPrompt,
  getExperiments,
  createExperiment,
  updateExperiment,
  getExperiment,
  ensureSeed,
} from '@/lib/db/store';
import { runExperiment } from '@/lib/core/ab-engine';
import { LLMError } from '@/lib/llm/adapter';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const CreateExperimentSchema = z.object({
  promptId: z.number().int().positive('promptId must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(255),
  baselineVersion: z
    .number()
    .int()
    .positive('baselineVersion must be a positive integer'),
  candidateVersion: z
    .number()
    .int()
    .positive('candidateVersion must be a positive integer'),
});

const UpdateExperimentSchema = z.object({
  id: z.number().int().positive('id must be a positive integer'),
  status: z.enum(['draft', 'running', 'completed'], {
    errorMap: () => ({
      message: 'Status must be one of: draft, running, completed',
    }),
  }),
  results: z.string().optional(),
  iterations: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(5),
});

// ---------------------------------------------------------------------------
// GET /api/experiments?promptId=<id>
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  ensureSeed();
  try {
    const { searchParams } = request.nextUrl;
    const promptIdParam = searchParams.get('promptId');

    if (!promptIdParam) {
      return NextResponse.json(
        { error: 'promptId query parameter is required' },
        { status: 400 }
      );
    }

    const promptId = parseInt(promptIdParam, 10);
    if (isNaN(promptId) || promptId <= 0) {
      return NextResponse.json({ error: 'Invalid promptId' }, { status: 400 });
    }

    const result = getExperiments(promptId).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch experiments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/experiments
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  ensureSeed();
  try {
    const body = await request.json();
    const parsed = CreateExperimentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { promptId, name, baselineVersion, candidateVersion } = parsed.data;

    if (baselineVersion === candidateVersion) {
      return NextResponse.json(
        { error: 'Baseline and candidate versions must be different' },
        { status: 400 }
      );
    }

    if (!getPrompt(promptId)) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const experiment = createExperiment({
      promptId,
      name,
      baselineVersion,
      candidateVersion,
    });
    return NextResponse.json(experiment, { status: 201 });
  } catch (error) {
    console.error('Failed to create experiment:', error);
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/experiments
//
// When status === "running", the request triggers a real A/B experiment that
// calls the configured LLM for both prompt versions and evaluates the output
// using an LLM judge.  Results are persisted automatically.
//
// For "draft" or "completed" status, the request performs a manual override
// (useful for seed data or admin operations).
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  ensureSeed();
  try {
    const body = await request.json();
    const parsed = UpdateExperimentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { id, status, results, iterations } = parsed.data;

    // ---- Trigger real experiment run ----
    if (status === 'running') {
      // Verify the experiment exists before attempting to run.
      const existing = getExperiment(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Experiment not found' },
          { status: 404 }
        );
      }

      if (existing.status === 'running') {
        return NextResponse.json(
          { error: 'Experiment is already running' },
          { status: 409 }
        );
      }

      try {
        const result = await runExperiment(id, iterations);
        return NextResponse.json(result);
      } catch (error) {
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
        throw error; // Re-throw for the generic 500 handler below.
      }
    }

    // ---- Manual status override (draft / completed) ----
    const updated = updateExperiment(id, status, results);
    if (!updated) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update experiment:', error);
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    );
  }
}
