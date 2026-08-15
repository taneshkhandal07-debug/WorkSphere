import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const teams = await prisma.team.findMany({
      include: {
        department: { select: { name: true } },
        members: {
          include: {
            user: { select: { firstName: true, lastName: true, designation: true } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, teams });
  } catch (error) {
    console.error('Fetch teams API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve teams' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ error: 'Access denied. Administrative rights required.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, departmentId, userIds = [] } = body;

    if (!name || !departmentId) {
      return NextResponse.json({ error: 'Team name and department binding are required.' }, { status: 400 });
    }

    // Create Team
    const team = await prisma.team.create({
      data: {
        name,
        description: description || null,
        departmentId,
        members: {
          create: userIds.map((id: string) => ({
            userId: id,
            role: 'MEMBER'
          }))
        }
      },
      include: {
        members: true
      }
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'TEAM_CREATED',
        details: `Team "${name}" created under department ID ${departmentId} with ${userIds.length} members by ${user.email}.`
      }
    });

    return NextResponse.json({ success: true, team });
  } catch (error) {
    console.error('Create team API error:', error);
    return NextResponse.json({ error: 'Failed to create team record' }, { status: 500 });
  }
}
