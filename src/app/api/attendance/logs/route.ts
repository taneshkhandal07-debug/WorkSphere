import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await prisma.attendance.findMany({
      where: { userId: user.id },
      orderBy: { checkIn: 'desc' },
      take: 60, // Last 60 days
    });

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Fetch attendance logs error:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendance logs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Find if there is an active (not checked out) session
    const activeSession = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        checkOut: null,
      },
      orderBy: { checkIn: 'desc' },
    });

    if (action === 'check-in') {
      if (activeSession) {
        return NextResponse.json(
          { error: 'You are already checked in. Check out of your current session first.' },
          { status: 400 }
        );
      }

      // Create new attendance record
      const log = await prisma.attendance.create({
        data: {
          userId: user.id,
          checkIn: now,
          date: todayStr,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_CHECK_IN',
          details: `Employee checked in at ${now.toLocaleTimeString()}.`,
        },
      });

      return NextResponse.json({ success: true, log });
    } 
    
    if (action === 'check-out') {
      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active session found. Please check in first.' },
          { status: 400 }
        );
      }

      // Calculate duration in minutes
      const diffMs = now.getTime() - activeSession.checkIn.getTime();
      const durationMinutes = Math.round(diffMs / (1000 * 60));

      // Update attendance record
      const log = await prisma.attendance.update({
        where: { id: activeSession.id },
        data: {
          checkOut: now,
          duration: durationMinutes,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'USER_CHECK_OUT',
          details: `Employee checked out at ${now.toLocaleTimeString()}. Duration: ${durationMinutes} minutes.`,
        },
      });

      return NextResponse.json({ success: true, log });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error) {
    console.error('Update attendance log error:', error);
    return NextResponse.json({ error: 'Failed to update attendance session' }, { status: 500 });
  }
}
