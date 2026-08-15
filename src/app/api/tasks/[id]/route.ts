import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { name: true, id: true } },
        assignee: { select: { firstName: true, lastName: true, email: true, id: true } },
        creator: { select: { firstName: true, lastName: true } },
        subtasks: { orderBy: { createdAt: 'asc' } },
        comments: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Fetch task detail API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve task' }, { status: 500 });
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
    const { title, description, status, priority, assigneeId, dueDate } = body;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { name: true, id: true } } }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const originalStatus = task.status;
    const originalAssigneeId = task.assigneeId;

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title || undefined,
        description: description !== undefined ? description : undefined,
        status: status || undefined,
        priority: priority || undefined,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      }
    });

    // 1. Audit status change
    if (status && status !== originalStatus) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: `TASK_STATUS_${status.toUpperCase()}`,
          details: `Task "${updatedTask.title}" status changed from ${originalStatus} to ${status}.`
        }
      });

      // Send status update notification to creator (if updater is not creator)
      if (task.creatorId !== user.id) {
        await prisma.notification.create({
          data: {
            userId: task.creatorId,
            senderId: user.id,
            title: 'Task Status Updated',
            message: `${user.firstName} changed task "${task.title}" status to "${status}".`,
            type: 'INFO',
            link: `/projects/${task.projectId}?tab=board`
          }
        });
      }

      // Send status update notification to assignee (if updater is not assignee)
      if (task.assigneeId && task.assigneeId !== user.id && task.assigneeId !== task.creatorId) {
        await prisma.notification.create({
          data: {
            userId: task.assigneeId,
            senderId: user.id,
            title: 'Task Status Updated',
            message: `${user.firstName} changed task "${task.title}" status to "${status}".`,
            type: 'INFO',
            link: `/projects/${task.projectId}?tab=board`
          }
        });
      }
    }

    // 2. Notification for assignee change
    if (assigneeId && assigneeId !== originalAssigneeId && assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          senderId: user.id,
          title: 'Task Assigned',
          message: `${user.firstName} assigned you task: "${updatedTask.title}".`,
          type: 'TASK_ASSIGNED',
          link: `/projects/${task.projectId}?tab=board`
        }
      });
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Update task API error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: taskId } });

    // Log Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TASK_DELETED',
        details: `Task ID ${taskId} ("${task.title}") deleted by ${user.email}.`
      }
    });

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task API error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
