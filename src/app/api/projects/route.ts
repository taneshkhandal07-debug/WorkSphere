import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';

    // Build project filter:
    // HR/Admins see all projects.
    // Managers and Employees only see projects they are members of.
    const projectFilter: any = {};
    if (!isAdminOrHr) {
      projectFilter.members = {
        some: { userId: user.id }
      };
    }

    const projects = await prisma.project.findMany({
      where: projectFilter,
      include: {
        department: {
          select: { name: true }
        },
        members: {
          include: {
            user: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        },
        tasks: {
          select: { status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate progress and task counts for each project
    const projectsWithStats = projects.map(proj => {
      const totalTasks = proj.tasks.length;
      const completedTasks = proj.tasks.filter(t => t.status === 'DONE').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: proj.id,
        name: proj.name,
        description: proj.description,
        status: proj.status,
        deadline: proj.deadline ? proj.deadline.toISOString() : null,
        department: proj.department ? proj.department.name : null,
        totalTasks,
        completedTasks,
        progress,
        memberCount: proj.members.length,
        members: proj.members.map(m => ({
          userId: m.userId,
          name: `${m.user.firstName} ${m.user.lastName}`,
          role: m.role
        })),
        createdAt: proj.createdAt.toISOString()
      };
    });

    return NextResponse.json({ success: true, projects: projectsWithStats });
  } catch (error) {
    console.error('Fetch projects API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve projects list' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR' && user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Access denied. Project creation requires Manager permissions.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, deadline, departmentId } = body;

    if (!name || !status) {
      return NextResponse.json({ error: 'Project name and status are required fields.' }, { status: 400 });
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status,
        deadline: deadline ? new Date(deadline) : null,
        departmentId: departmentId || null,
      }
    });

    // Automatically add the creator as the OWNER member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: 'OWNER'
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PROJECT_CREATED',
        details: `Project "${name}" created.`,
      }
    });

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('Create project API error:', error);
    return NextResponse.json({ error: 'Failed to create project record' }, { status: 500 });
  }
}
