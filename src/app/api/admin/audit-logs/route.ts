import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    
    // Strict privilege guard: only HR and Super Admin can audit logs
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'HR')) {
      return NextResponse.json({ error: 'Access denied. Administrator privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';

    const filterClause: any = {};
    if (query) {
      filterClause.OR = [
        { action: { contains: query } },
        { details: { contains: query } },
        { user: { firstName: { contains: query } } },
        { user: { lastName: { contains: query } } },
        { user: { email: { contains: query } } },
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where: filterClause,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Cap results at 100 most recent logs
    });

    const formatted = logs.map(l => ({
      id: l.id,
      action: l.action,
      details: l.details,
      timestamp: l.createdAt.toISOString(),
      actorName: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System / Root',
      actorEmail: l.user ? l.user.email : 'system@worksphere.com'
    }));

    return NextResponse.json({ success: true, logs: formatted });
  } catch (error) {
    console.error('Fetch audit logs API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve system audit logs' }, { status: 500 });
  }
}
