import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied. Privileged role required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get('date') || '';
    const userIdQuery = searchParams.get('userId') || '';
    const deptIdQuery = searchParams.get('departmentId') || '';

    const filterClause: any = {};

    // 1. Employee query filter
    if (userIdQuery) {
      filterClause.userId = userIdQuery;
    }

    // 2. Date query filter
    if (dateQuery) {
      filterClause.date = dateQuery;
    }

    // 3. Department query filter
    if (deptIdQuery) {
      filterClause.user = {
        departmentId: deptIdQuery
      };
    }

    // Restrict Managers to their own department's roster
    if (user.role === 'MANAGER') {
      filterClause.user = {
        ...filterClause.user,
        departmentId: user.departmentId || 'MANAGER_NO_DEPT_ASSIGNED'
      };
    }

    const attendanceRecords = await prisma.attendance.findMany({
      where: filterClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            employeeId: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 100
    });

    const formatted = attendanceRecords.map(r => ({
      id: r.id,
      date: r.date,
      checkIn: r.checkIn.toISOString(),
      checkOut: r.checkOut ? r.checkOut.toISOString() : null,
      workingMinutes: r.duration,
      employeeName: `${r.user.firstName} ${r.user.lastName}`,
      employeeCode: r.user.employeeId || 'N/A',
      departmentName: r.user.department?.name || 'GLOBAL'
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error) {
    console.error('Fetch global attendance API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendance logs' }, { status: 500 });
  }
}
