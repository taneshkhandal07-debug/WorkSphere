import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check project membership (unless HR/Super Admin)
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';
    if (!isAdminOrHr) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: user.id }
        }
      });
      if (!membership) {
        return NextResponse.json({ error: 'Access denied. You are not a member of this project.' }, { status: 403 });
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        department: {
          select: { name: true }
        },
        members: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true, employeeId: true, role: true, designation: true }
            }
          }
        },
        tasks: {
          include: {
            assignee: {
              select: { firstName: true, lastName: true, email: true, id: true }
            },
            creator: {
              select: { firstName: true, lastName: true }
            },
            subtasks: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Calculate aggregated statistics
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
    const activeTasks = project.tasks.filter(t => t.status !== 'DONE' && t.status !== 'BACKLOG').length;
    const now = new Date();
    const overdueTasks = project.tasks.filter(t => t.status !== 'DONE' && t.dueDate && new Date(t.dueDate) < now).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Workload mapping
    const workload: Record<string, { name: string; total: number; completed: number }> = {};
    project.members.forEach(member => {
      const name = `${member.user.firstName} ${member.user.lastName}`;
      workload[member.userId] = { name, total: 0, completed: 0 };
    });

    project.tasks.forEach(task => {
      if (task.assigneeId && workload[task.assigneeId]) {
        workload[task.assigneeId].total += 1;
        if (task.status === 'DONE') {
          workload[task.assigneeId].completed += 1;
        }
      }
    });

    const workloadList = Object.values(workload);

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        stats: {
          totalTasks,
          completedTasks,
          activeTasks,
          overdueTasks,
          progress,
          workload: workloadList
        }
      }
    });
  } catch (error) {
    console.error('Fetch project details API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve project details' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Access denied. Project editing requires Manager permissions.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, deadline, departmentId } = body;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        status: status || undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PROJECT_UPDATED',
        details: `Project "${updatedProject.name}" updated by ${user.email}.`,
      }
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('Update project API error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
