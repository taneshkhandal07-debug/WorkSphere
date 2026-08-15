import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Fetch Today's Attendance Session
    const attendanceToday = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        date: todayStr,
      },
      orderBy: { checkIn: 'desc' }
    });

    const isCheckedIn = !!attendanceToday && !attendanceToday.checkOut;
    const checkInTime = attendanceToday ? attendanceToday.checkIn.toISOString() : null;
    const checkOutTime = attendanceToday && attendanceToday.checkOut ? attendanceToday.checkOut.toISOString() : null;

    // 2. Fetch Personal Metrics
    // Active Projects Count
    const activeProjects = await prisma.projectMember.count({
      where: {
        userId: user.id,
        project: { status: 'ACTIVE' }
      }
    });

    // Task Counts
    const pendingTasks = await prisma.task.count({
      where: {
        assigneeId: user.id,
        status: { not: 'DONE' }
      }
    });

    const completedTasks = await prisma.task.count({
      where: {
        assigneeId: user.id,
        status: 'DONE'
      }
    });

    const now = new Date();
    const overdueTasks = await prisma.task.count({
      where: {
        assigneeId: user.id,
        status: { not: 'DONE' },
        dueDate: { lt: now }
      }
    });

    // Unread Notifications Count
    const unreadNotifications = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false
      }
    });

    // Mock count for unread messages (until communication is fully built)
    const unreadMessages = 3; 

    // 3. Fetch Upcoming Deadlines (Assigned tasks with dueDate, sorted by dueDate ascending)
    const upcomingDeadlines = await prisma.task.findMany({
      where: {
        assigneeId: user.id,
        status: { not: 'DONE' },
        dueDate: { not: null }
      },
      orderBy: { dueDate: 'asc' },
      take: 4,
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: {
          select: { name: true }
        }
      }
    });

    // 4. Fetch Activity Feed (Recent audit logs and comments)
    // We fetch the 10 most recent system audit logs to populate a live activity stream
    const activityLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    const activityFeed = activityLogs.map(log => ({
      id: log.id,
      action: log.action,
      details: log.details,
      timestamp: log.createdAt.toISOString(),
      user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'
    }));

    return NextResponse.json({
      success: true,
      stats: {
        isCheckedIn,
        checkInTime,
        checkOutTime,
        activeProjects,
        pendingTasks,
        completedTasks,
        overdueTasks,
        unreadMessages,
        unreadNotifications
      },
      upcomingDeadlines,
      activityFeed
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to retrieve dashboard metrics' }, { status: 500 });
  }
}
