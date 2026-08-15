import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId') || undefined;
    const assigneeId = searchParams.get('assigneeId') || undefined;
    const status = searchParams.get('status') || undefined;
    const priority = searchParams.get('priority') || undefined;

    // Build filter
    const filterClause: any = {};
    if (projectId) filterClause.projectId = projectId;
    if (assigneeId) filterClause.assigneeId = assigneeId;
    if (status) filterClause.status = status;
    if (priority) filterClause.priority = priority;

    // Security check: if not admin/HR, verify they belong to these projects
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';
    if (!isAdminOrHr) {
      if (projectId) {
        const member = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: user.id } }
        });
        if (!member) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      } else {
        // If query covers all projects, restrict to projects where user is a member
        const myProjects = await prisma.projectMember.findMany({
          where: { userId: user.id },
          select: { projectId: true }
        });
        const projectIds = myProjects.map(p => p.projectId);
        filterClause.projectId = { in: projectIds };
      }
    }

    const tasks = await prisma.task.findMany({
      where: filterClause,
      include: {
        project: {
          select: { name: true, id: true }
        },
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        creator: {
          select: { firstName: true, lastName: true }
        },
        subtasks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Fetch tasks API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, projectId, assigneeId, priority, status = 'TODO', dueDate } = body;

    if (!title || !projectId || !priority) {
      return NextResponse.json({ error: 'Title, project, and priority are required fields.' }, { status: 400 });
    }

    // Verify requesting user is member of project or has manager rights
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';
    if (!isAdminOrHr) {
      const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: user.id } }
      });
      if (!membership) {
        return NextResponse.json({ error: 'Access denied. You must be a member of the project to add tasks.' }, { status: 403 });
      }
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        projectId,
        assigneeId: assigneeId || null,
        creatorId: user.id,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        project: { select: { name: true } }
      }
    });

    // Create Notification for the assignee
    if (assigneeId && assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          senderId: user.id,
          title: 'New Task Assigned',
          message: `${user.firstName} assigned you task: "${title}" in project "${task.project.name}".`,
          type: 'TASK_ASSIGNED',
          link: `/projects/${projectId}?tab=board`
        }
      });
    }

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TASK_CREATED',
        details: `Task "${title}" created under project "${task.project.name}".`
      }
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Create task API error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
