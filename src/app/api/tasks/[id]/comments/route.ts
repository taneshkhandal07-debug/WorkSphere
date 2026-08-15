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
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, creatorId: true, assigneeId: true, projectId: true }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        content: content.trim(),
        taskId,
        userId: user.id,
      },
      include: {
        user: { select: { firstName: true, lastName: true } }
      }
    });

    // Notify assignee/reporter if someone else commented
    const recipients = new Set<string>();
    if (task.creatorId !== user.id) recipients.add(task.creatorId);
    if (task.assigneeId && task.assigneeId !== user.id) recipients.add(task.assigneeId);

    for (const recipientId of recipients) {
      await prisma.notification.create({
        data: {
          userId: recipientId,
          senderId: user.id,
          title: 'New Task Comment',
          message: `${user.firstName} commented on task: "${task.title}".`,
          type: 'COMMENT_ADDED',
          link: `/projects/${task.projectId}?tab=board`
        }
      });
    }

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error('Create task comment API error:', error);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
