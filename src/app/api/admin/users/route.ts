import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize session
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Access denied. Please log in.' }, { status: 401 });
    }

    const isAdminOrHr = currentUser.role === 'HR' || currentUser.role === 'SUPER_ADMIN';

    // 2. Build Query Filters based on Role Permissions
    // Employees and Managers can only see ACTIVE accounts.
    // HR and Super Admins can see all account states (PENDING, ACTIVE, SUSPENDED, REJECTED, DEACTIVATED).
    const whereClause: any = {};
    if (!isAdminOrHr) {
      whereClause.status = 'ACTIVE';
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        role: true,
        status: true,
        designation: true,
        departmentId: true,
        profileImage: true,
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        managerId: true,
        manager: {
          select: {
            firstName: true,
            lastName: true,
          }
        },
        createdAt: true,
      },
      orderBy: { firstName: 'asc' }, // Alphabetical sort is standard for directories
    });

    return NextResponse.json({ success: true, users, role: currentUser.role });
  } catch (error) {
    console.error('Fetch users admin API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve directory listings' }, { status: 500 });
  }
}
