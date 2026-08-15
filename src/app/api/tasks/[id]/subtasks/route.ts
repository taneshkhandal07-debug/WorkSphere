import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Subtask title cannot be empty' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const subtask = await prisma.subtask.create({
      data: {
        title: title.trim(),
        taskId,
        isCompleted: false
      }
    });

    return NextResponse.json({ success: true, subtask });
  } catch (error) {
    console.error('Create subtask API error:', error);
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { subtaskId, isCompleted } = body;

    if (!subtaskId) {
      return NextResponse.json({ error: 'Subtask ID is required' }, { status: 400 });
    }

    const subtask = await prisma.subtask.findUnique({ where: { id: subtaskId } });
    if (!subtask || subtask.taskId !== taskId) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: { isCompleted }
    });

    return NextResponse.json({ success: true, subtask: updated });
  } catch (error) {
    console.error('Update subtask API error:', error);
    return NextResponse.json({ error: 'Failed to toggle checklist item' }, { status: 500 });
  }
}
