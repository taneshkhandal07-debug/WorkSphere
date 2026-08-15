import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // HR and Super Admins can see all files.
    // Managers and Employees see files belonging to:
    // 1. Projects they are members of.
    // 2. Messages/Conversations they belong to.
    // 3. Files they uploaded.
    const isAdminOrHr = user.role === 'HR' || user.role === 'SUPER_ADMIN';

    let filterClause: any = {};

    if (!isAdminOrHr) {
      // Find project IDs where the user is a member
      const userProjects = await prisma.projectMember.findMany({
        where: { userId: user.id },
        select: { projectId: true }
      });
      const projectIds = userProjects.map(p => p.projectId);

      // Find conversation IDs where the user is a member
      const userConversations = await prisma.conversationMember.findMany({
        where: { userId: user.id },
        select: { conversationId: true }
      });
      const conversationIds = userConversations.map(c => c.conversationId);

      // Match files associated with those projects, conversations, or uploaded by self
      filterClause.OR = [
        { uploaderId: user.id },
        { projectId: { in: projectIds } },
        { 
          message: {
            conversationId: { in: conversationIds }
          } 
        }
      ];
    }

    const files = await prisma.file.findMany({
      where: filterClause,
      include: {
        uploader: {
          select: { firstName: true, lastName: true, email: true }
        },
        project: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = files.map(f => ({
      id: f.id,
      name: f.name,
      url: f.url,
      mimeType: f.mimeType,
      size: f.size,
      uploaderName: `${f.uploader.firstName} ${f.uploader.lastName}`,
      projectName: f.project?.name || 'Shared Drive / Chat',
      createdAt: f.createdAt.toISOString()
    }));

    return NextResponse.json({ success: true, files: formatted });
  } catch (error) {
    console.error('Fetch files API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve shared files.' }, { status: 500 });
  }
}
