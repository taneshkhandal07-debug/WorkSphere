import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Await async params to satisfy Next.js 15/16 standards
    const { id: userId } = await params;

    // 2. Authenticate and authorize requester
    const currentUser = await getSessionUser();
    if (!currentUser || (currentUser.role !== 'HR' && currentUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 444 });
    }

    const body = await req.json();
    const { action } = body;

    let updatedStatus = targetUser.status;
    let updatedRole = targetUser.role;
    let updatedDepartmentId = targetUser.departmentId;
    let updatedDesignation = targetUser.designation;
    let updatedEmployeeId = targetUser.employeeId;
    let logMessage = '';

    switch (action) {
      case 'approve':
        updatedStatus = 'ACTIVE';
        // Generate an employee ID if they don't have one
        if (!updatedEmployeeId) {
          const count = await prisma.user.count({ where: { status: 'ACTIVE' } });
          updatedEmployeeId = `EMP-${String(count + 1).padStart(3, '0')}`;
        }
        logMessage = `Approved user registration. Assigned employee ID: ${updatedEmployeeId}.`;
        break;

      case 'reject':
        updatedStatus = 'REJECTED';
        logMessage = 'Rejected user registration.';
        break;

      case 'suspend':
        updatedStatus = 'SUSPENDED';
        logMessage = 'Suspended employee account.';
        // Force logout: terminate all active database sessions for this user
        await prisma.session.deleteMany({ where: { userId } });
        break;

      case 'reactivate':
        updatedStatus = 'ACTIVE';
        logMessage = 'Reactivated employee account.';
        break;

      case 'deactivate':
        updatedStatus = 'DEACTIVATED';
        logMessage = 'Deactivated employee account.';
        // Force logout
        await prisma.session.deleteMany({ where: { userId } });
        break;

      case 'update':
        const { role, departmentId, designation } = body;
        if (role) updatedRole = role;
        // Map empty string or undefined to null
        updatedDepartmentId = departmentId || null;
        updatedDesignation = designation || null;
        logMessage = `Updated employee profile: role=${updatedRole}, departmentId=${updatedDepartmentId}, designation=${updatedDesignation}.`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }

    // Update User
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: updatedStatus,
        role: updatedRole,
        departmentId: updatedDepartmentId,
        designation: updatedDesignation,
        employeeId: updatedEmployeeId,
      },
    });

    // Create Approval Notification for newly approved user
    if (action === 'approve') {
      await prisma.notification.create({
        data: {
          userId,
          title: 'Account Activated',
          message: `Congratulations! Your WorkSphere profile has been approved by HR. Employee ID: ${updatedEmployeeId}`,
          type: 'APPROVAL',
          link: '/dashboard'
        }
      });
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: `ADMIN_${action.toUpperCase()}_USER`,
        details: `Administrator ${currentUser.email} performed action on ${targetUser.email}. Details: ${logMessage}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        status: updatedUser.status,
        role: updatedUser.role,
        departmentId: updatedUser.departmentId,
        designation: updatedUser.designation,
        employeeId: updatedUser.employeeId,
      },
    });
  } catch (error) {
    console.error('Admin update user API error:', error);
    return NextResponse.json({ error: 'Failed to perform administrative action' }, { status: 500 });
  }
}
