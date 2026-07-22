import { NextRequest, NextResponse } from 'next/server';
import { getProject, getPrompts, deleteProject, ensureSeed } from '@/lib/db/store';

function parseId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return isNaN(id) || id <= 0 ? null : id;
}

// GET /api/projects/[id] — project detail with prompts
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  ensureSeed();
  try {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const prompts = getPrompts(id).map((p) => ({
      ...p,
      variables: JSON.parse(p.variables),
    }));

    return NextResponse.json({ ...project, prompts });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete a project (cascades prompts)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  ensureSeed();
  try {
    const id = parseId(params.id);
    if (id === null) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 });
    }

    const deleted = deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
