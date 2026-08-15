import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // 1. Authorize session
    const currentUser = await getSessionUser();
    if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'HR' && currentUser.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const filterDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    let filterDeptId = searchParams.get('departmentId') || undefined;
    const searchName = searchParams.get('searchName') || undefined;

    // 3. Enforce Manager Role Permissions
    // Managers are restricted to employees in their department or their direct subordinates
    if (currentUser.role === 'MANAGER') {
      if (!currentUser.departmentId) {
        // If the manager has no department, restrict to only their direct subordinates
        filterDeptId = undefined; 
      } else {
        // Force filter to the manager's department
        filterDeptId = currentUser.departmentId;
      }
    }

    // 4. Construct user filter query clauses
    const userWhereClause: any = {
      status: 'ACTIVE',
    };

    if (filterDeptId) {
      userWhereClause.departmentId = filterDeptId;
    }

    if (currentUser.role === 'MANAGER' && !currentUser.departmentId) {
      userWhereClause.managerId = currentUser.id;
    }

    if (searchName) {
      userWhereClause.OR = [
        { firstName: { contains: searchName } },
        { lastName: { contains: searchName } },
        { email: { contains: searchName } },
      ];
    }

    // Find all matching users
    const filteredUsers = await prisma.user.findMany({
      where: userWhereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeId: true,
        departmentId: true,
        department: { select: { name: true } }
      }
    });

    const userIds = filteredUsers.map(u => u.id);

    // 5. Query attendance logs for these users on the specified date
    const logs = await prisma.attendance.findMany({
      where: {
        date: filterDate,
        userId: { in: userIds }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { checkIn: 'desc' }
    });

    // 6. Calculate Aggregated Summary Stats
    const totalEmployees = filteredUsers.length;
    const presentEmployees = logs.length;
    const absentEmployees = Math.max(0, totalEmployees - presentEmployees);
    const currentlyActive = logs.filter(l => !l.checkOut).length;
    const attendancePercentage = totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 0;

    // 7. Calculate Department-Wise Attendance Stats
    // We query all departments to map attendance percentages
    const departments = await prisma.department.findMany({
      include: {
        users: { where: { status: 'ACTIVE' } }
      }
    });

    const departmentStats = departments
      .filter(dept => {
        // If manager, only show their department
        if (currentUser.role === 'MANAGER' && currentUser.departmentId) {
          return dept.id === currentUser.departmentId;
        }
        return true;
      })
      .map(dept => {
        const deptUserIds = dept.users.map(u => u.id);
        const deptPresent = logs.filter(l => deptUserIds.includes(l.userId)).length;
        const totalDeptUsers = deptUserIds.length;
        const pct = totalDeptUsers > 0 ? Math.round((deptPresent / totalDeptUsers) * 100) : 0;

        return {
          name: dept.name,
          Total: totalDeptUsers,
          Present: deptPresent,
          Percentage: pct
        };
      });

    return NextResponse.json({
      success: true,
      stats: {
        totalEmployees,
        presentEmployees,
        absentEmployees,
        currentlyActive,
        attendancePercentage
      },
      departmentStats,
      logs
    });
  } catch (error) {
    console.error('Fetch organization attendance error:', error);
    return NextResponse.json({ error: 'Failed to retrieve attendance aggregates' }, { status: 500 });
  }
}
