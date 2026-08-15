import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    // 1. Gather Basic Count KPI aggregates
    const totalEmployees = await prisma.user.count();
    const activeEmployees = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const pendingAccounts = await prisma.user.count({ where: { status: 'PENDING' } });
    
    // Online counts (mock/approximate based on unchecked-out attendance sessions today)
    const todayStr = new Date().toISOString().split('T')[0];
    const onlineUsersCount = await prisma.attendance.count({
      where: {
        date: todayStr,
        checkOut: null
      }
    });

    const totalProjects = await prisma.project.count();
    const activeProjects = await prisma.project.count({ where: { status: 'ACTIVE' } });
    
    const openTasks = await prisma.task.count({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] }
      }
    });
    
    // Overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        status: { not: 'DONE' },
        dueDate: { lt: new Date() }
      }
    });

    const todayAttendanceCount = await prisma.attendance.count({
      where: { date: todayStr }
    });

    // 2. Department distribution data
    const departments = await prisma.department.findMany({
      include: {
        users: true
      }
    });
    
    const deptDistribution = departments.map(d => ({
      name: d.name,
      value: d.users.length
    }));

    // 3. Task status distribution
    const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    const taskStatusDist = await Promise.all(
      statuses.map(async (st) => {
        const count = await prisma.task.count({ where: { status: st } });
        return { name: st, count };
      })
    );

    // 4. Project Completion ratios
    const projects = await prisma.project.findMany({
      include: {
        tasks: { select: { status: true } }
      }
    });
    
    const projectCompletion = projects.map(p => {
      const total = p.tasks.length;
      const completed = p.tasks.filter(t => t.status === 'DONE').length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        name: p.name,
        progress
      };
    });

    // 5. Workload (Tasks per active employee)
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        assignedTasks: { where: { status: { not: 'DONE' } } }
      },
      take: 8
    });
    
    const employeeWorkload = activeUsers.map(u => ({
      name: `${u.firstName} ${u.lastName.slice(0, 1)}.`,
      tasks: u.assignedTasks.length
    }));

    // 6. Attendance trends (past 5 days)
    const trends = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await prisma.attendance.count({ where: { date: dateStr } });
      trends.push({
        date: new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }),
        Attendees: count
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        pendingAccounts,
        onlineUsers: onlineUsersCount || 1, // fallback default online user
        totalProjects,
        activeProjects,
        openTasks,
        overdueTasks,
        todayAttendance: todayAttendanceCount
      },
      charts: {
        deptDistribution,
        taskStatus: taskStatusDist,
        projectCompletion,
        employeeWorkload,
        attendanceTrends: trends
      }
    });
  } catch (error) {
    console.error('Fetch admin stats API error:', error);
    return NextResponse.json({ error: 'Failed to compile administration metrics.' }, { status: 500 });
  }
}
