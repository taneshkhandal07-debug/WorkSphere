import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { content, reactions } = body;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const updateData: any = {};

    // 1. Handle message edit
    if (content !== undefined) {
      // Only the sender can edit their message
      if (message.senderId !== user.id) {
        return NextResponse.json({ error: 'Access denied. You can only edit your own messages.' }, { status: 403 });
      }
      updateData.content = content;
      updateData.isEdited = true;
    }

    // 2. Handle reaction sync
    if (reactions !== undefined) {
      updateData.reactions = JSON.stringify(reactions);
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: updateData,
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true }
        },
        files: true
      }
    });

    return NextResponse.json({ success: true, message: updatedMessage });
  } catch (error) {
    console.error('Update message API error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: messageId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Only sender or admin can delete
    const isOwner = message.senderId === user.id;
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'HR';
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied. You can only delete your own messages.' }, { status: 403 });
    }

    // Soft-delete
    const deleted = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: null,
        isDeleted: true,
      }
    });

    return NextResponse.json({ success: true, message: deleted });
  } catch (error) {
    console.error('Delete message API error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
