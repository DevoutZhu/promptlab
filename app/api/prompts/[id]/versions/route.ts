import { NextRequest, NextResponse } from 'next/server';
import { getVersionHistory, ensureSeed } from '@/lib/db/store';

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

// GET /api/prompts/[id]/versions — all versions of a prompt, newest first
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

    const versions = getVersionHistory(id);
    if (versions.length === 0) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }

    const parsed = versions.map((v) => ({
      ...v,
      variables: JSON.parse(v.variables) as string[],
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Failed to fetch versions:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}
