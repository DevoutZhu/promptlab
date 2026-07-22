import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPrompt, updatePrompt, getVersionHistory, ensureSeed } from '@/lib/db/store';

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

const UpdatePromptSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

// GET /api/prompts/[id] — single prompt with full version history
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  ensureSeed();
  try {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }

    const prompt = getPrompt(id);
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const versions = getVersionHistory(id).map((v) => ({
      ...v,
      variables: JSON.parse(v.variables) as string[],
    }));

    return NextResponse.json({
      ...prompt,
      variables: JSON.parse(prompt.variables) as string[],
      versions,
    });
  } catch (error) {
    console.error('Failed to fetch prompt:', error);
    return NextResponse.json({ error: 'Failed to fetch prompt' }, { status: 500 });
  }
}

// PATCH /api/prompts/[id] — update prompt (creates a new version)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  ensureSeed();
  try {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = UpdatePromptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const updated = updatePrompt(id, parsed.data.content);
    if (!updated) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updated,
      variables: JSON.parse(updated.variables) as string[],
    });
  } catch (error) {
    console.error('Failed to update prompt:', error);
    return NextResponse.json({ error: 'Failed to update prompt' }, { status: 500 });
  }
}
