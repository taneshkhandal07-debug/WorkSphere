import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.id }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied. You are not a participant in this chat.' }, { status: 403 });
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        files: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Limit to last 100 messages
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Fetch conversation messages API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: user.id }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await req.json();
    const { content, fileId, replyToId } = body;

    if (!content && !fileId) {
      return NextResponse.json({ error: 'Message body or file attachment is required.' }, { status: 400 });
    }

    // Create the message record
    const message = await prisma.message.create({
      data: {
        content: content || null,
        conversationId,
        senderId: user.id,
        replyToId: replyToId || null,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        files: true,
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true, lastName: true } }
          }
        }
      }
    });

    // Query other conversation members and details to send notifications
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { userId: { not: user.id } }
        }
      }
    });

    if (conversation && conversation.members.length > 0) {
      const convTitle = conversation.isGroup
        ? `New Group Message in ${conversation.name}`
        : `New Message from ${user.firstName}`;
      
      await prisma.notification.createMany({
        data: conversation.members.map(m => ({
          userId: m.userId,
          senderId: user.id,
          title: convTitle,
          message: content || 'Shared an attachment.',
          type: 'INFO',
          link: '/messages'
        }))
      });
    }

    // If fileId is provided, associate the File record with this message
    if (fileId) {
      await prisma.file.update({
        where: { id: fileId },
        data: { messageId: message.id }
      });
      
      // Re-fetch message with files attached
      const messageWithFiles = await prisma.message.findUnique({
        where: { id: message.id },
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
          files: true,
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: { select: { firstName: true, lastName: true } }
            }
          }
        }
      });
      
      // Update Conversation updatedAt timestamp
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });

      return NextResponse.json({ success: true, message: messageWithFiles });
    }

    // Update Conversation updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Send message API error:', error);
    return NextResponse.json({ error: 'Failed to broadcast message' }, { status: 500 });
  }
}
