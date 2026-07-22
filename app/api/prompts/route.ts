import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProject, getPrompts, createPrompt, ensureSeed } from '@/lib/db/store';

const CreatePromptSchema = z.object({
  projectId: z.number().int().positive('projectId must be a positive integer'),
  name: z.string().min(1, 'Name is required').max(255),
  content: z.string().min(1, 'Content is required'),
  variables: z.array(z.string()).default([]),
});

// GET /api/prompts?projectId=<id> — latest version of each prompt in a project
export async function GET(request: NextRequest) {
  ensureSeed();
  try {
    const { searchParams } = request.nextUrl;
    const projectIdParam = searchParams.get('projectId');

    if (!projectIdParam) {
      return NextResponse.json({ error: 'projectId query parameter is required' }, { status: 400 });
    }

    const projectId = parseInt(projectIdParam, 10);
    if (isNaN(projectId) || projectId <= 0) {
      return NextResponse.json({ error: 'Invalid projectId' }, { status: 400 });
    }

    // getPrompts returns all version rows; keep only the newest version per name
    const rows = getPrompts(projectId).sort((a, b) => b.version - a.version);
    const seen = new Map<string, boolean>();
    const latest = rows.filter((r) => {
      if (seen.has(r.name)) return false;
      seen.set(r.name, true);
      return true;
    });

    const parsed = latest.map((p) => ({
      ...p,
      variables: JSON.parse(p.variables) as string[],
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to fetch prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

// POST /api/prompts — create a new prompt (version 1)
export async function POST(request: NextRequest) {
  ensureSeed();
  try {
    const body = await request.json();
    const parsed = CreatePromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { projectId, name, content, variables } = parsed.data;

    if (!getProject(projectId)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const prompt = createPrompt({ projectId, name, content, variables });
    return NextResponse.json(
      { ...prompt, variables },
      { status: 201 },
    );
  } catch (error) {
    console.error('Failed to create prompt:', error);
    return NextResponse.json({ error: 'Failed to create prompt' }, { status: 500 });
  }
}
