import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, departments });
  } catch (error) {
    console.error('Fetch departments API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve departments list' }, { status: 500 });
  }
}
