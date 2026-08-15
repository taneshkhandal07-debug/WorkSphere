import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify requesting user is authorized to manage members
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isAdminOrHr) {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: user.id }
        }
      });
      // Standard members cannot add/remove members, only OWNER role can do it
      if (!membership || membership.role !== 'OWNER') {
        return NextResponse.json({ error: 'Access denied. Only project owners or administrators can manage members.' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { action, userId, role = 'MEMBER' } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'add') {
      // Check duplicate
      const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });
      if (existing) {
        return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 });
      }

      await prisma.projectMember.create({
        data: { projectId, userId, role }
      });

      // Send notification to the added member
      await prisma.notification.create({
        data: {
          userId,
          senderId: user.id,
          title: 'Added to Project Workspace',
          message: `You have been added as a member of project "${project.name}" as ${role}.`,
          type: 'INFO',
          link: `/projects/${projectId}`
        }
      });

      // Log Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PROJECT_MEMBER_ADDED',
          details: `Added user ${userId} to project ${project.name} as ${role}.`
        }
      });

      return NextResponse.json({ success: true, message: 'Member added successfully' });
    } 
    
    if (action === 'remove') {
      // If attempting to remove the last owner, prevent it
      if (role === 'OWNER') {
        const ownerCount = await prisma.projectMember.count({
          where: { projectId, role: 'OWNER' }
        });
        if (ownerCount <= 1) {
          return NextResponse.json({ error: 'Cannot remove the last project owner.' }, { status: 400 });
        }
      }

      await prisma.projectMember.delete({
        where: { projectId_userId: { projectId, userId } }
      });

      // Log Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PROJECT_MEMBER_REMOVED',
          details: `Removed user ${userId} from project ${project.name}.`
        }
      });

      return NextResponse.json({ success: true, message: 'Member removed successfully' });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (error) {
    console.error('Manage project members API error:', error);
    return NextResponse.json({ error: 'Failed to manage project membership' }, { status: 500 });
  }
}
