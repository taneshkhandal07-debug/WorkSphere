import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based visibility enforcement:
    // HR and Super Admins see all announcements.
    // Managers and Employees see general (targetDepartmentId is null) or those matching their department.
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';
    const filterClause: any = {};

    if (!isAdminOrHr) {
      filterClause.OR = [
        { targetDepartmentId: null },
        { targetDepartmentId: user.departmentId || 'GLOBAL' }
      ];
    }

    const announcements = await prisma.announcement.findMany({
      where: filterClause,
      include: {
        author: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const formatted = announcements.map(ann => ({
      id: ann.id,
      title: ann.title,
      content: ann.content,
      priority: ann.priority,
      isPinned: ann.isPinned,
      targetDepartmentId: ann.targetDepartmentId,
      attachmentUrl: ann.attachmentUrl,
      authorName: `${ann.author.firstName} ${ann.author.lastName}`,
      createdAt: ann.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, announcements: formatted });
  } catch (error) {
    console.error('Fetch announcements API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ error: 'Access denied. Only HR and Super Admins can publish bulletins.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, priority = 'NORMAL', isPinned = false, targetDepartmentId, attachmentUrl } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required fields.' }, { status: 400 });
    }

    // 1. Create the Announcement record
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority,
        isPinned,
        targetDepartmentId: targetDepartmentId || null,
        attachmentUrl: attachmentUrl || null,
        authorId: user.id
      }
    });

    // 2. Query target audience users to send notifications
    const targetUserFilter: any = {
      status: 'ACTIVE',
      id: { not: user.id } // Exclude the publisher
    };

    if (targetDepartmentId) {
      targetUserFilter.departmentId = targetDepartmentId;
    }

    const targetUsers = await prisma.user.findMany({
      where: targetUserFilter,
      select: { id: true }
    });

    // Create notifications for target users
    const notificationTitle = priority === 'URGENT' ? 'Urgent Company Announcement' : 'New Company Bulletin';
    
    // Batch create notifications
    if (targetUsers.length > 0) {
      await prisma.notification.createMany({
        data: targetUsers.map(target => ({
          userId: target.id,
          senderId: user.id,
          title: notificationTitle,
          message: title,
          type: 'INFO',
          link: '/announcements'
        }))
      });
    }

    // 3. Write System Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ANNOUNCEMENT_PUBLISHED',
        details: `Announcement "${title}" published by HR/Admin. Target department: ${targetDepartmentId || 'All'}.`
      }
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error) {
    console.error('Publish announcement API error:', error);
    return NextResponse.json({ error: 'Failed to publish announcement' }, { status: 500 });
  }
}
