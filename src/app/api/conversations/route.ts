import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch conversations the user is member of
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId: user.id }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, designation: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formattedList = conversations.map(conv => {
      const lastMsg = conv.messages[0] || null;
      
      return {
        id: conv.id,
        name: conv.name,
        isGroup: conv.isGroup,
        updatedAt: conv.updatedAt.toISOString(),
        members: conv.members.map(m => ({
          userId: m.userId,
          name: `${m.user.firstName} ${m.user.lastName}`,
          email: m.user.email,
          role: m.user.role,
          designation: m.user.designation
        })),
        lastMessage: lastMsg ? {
          id: lastMsg.id,
          content: lastMsg.content,
          senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
          createdAt: lastMsg.createdAt.toISOString()
        } : null
      };
    });

    return NextResponse.json({ success: true, conversations: formattedList });
  } catch (error) {
    console.error('Fetch conversations API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { isGroup, name, description, userIds } = body; // userIds is array of recipient user IDs

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'At least one participant user ID is required.' }, { status: 400 });
    }

    if (!isGroup) {
      // 1. Direct Message Chat
      const recipientId = userIds[0];
      if (recipientId === user.id) {
        return NextResponse.json({ error: 'Cannot start a direct conversation with yourself.' }, { status: 400 });
      }

      // Check if direct conversation already exists between these two users
      const existingDM = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: recipientId } } }
          ]
        },
        include: {
          members: {
            include: { user: { select: { firstName: true, lastName: true } } }
          }
        }
      });

      if (existingDM) {
        return NextResponse.json({ success: true, conversation: existingDM, isExisting: true });
      }

      // Create new DM
      const conv = await prisma.conversation.create({
        data: {
          isGroup: false,
          members: {
            create: [
              { userId: user.id },
              { userId: recipientId }
            ]
          }
        },
        include: {
          members: {
            include: { user: { select: { firstName: true, lastName: true } } }
          }
        }
      });

      return NextResponse.json({ success: true, conversation: conv, isExisting: false });
    } else {
      // 2. Group Chat
      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Group name is required.' }, { status: 400 });
      }

      // Create conversation
      const conv = await prisma.conversation.create({
        data: {
          isGroup: true,
          name: name.trim(),
          members: {
            create: [
              { userId: user.id }, // Creator
              ...userIds.map(id => ({ userId: id }))
            ]
          }
        },
        include: {
          members: {
            include: { user: { select: { firstName: true, lastName: true } } }
          }
        }
      });

      // Write Audit Log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CHAT_GROUP_CREATED',
          details: `Group conversation "${name.trim()}" created by ${user.email}.`
        }
      });

      return NextResponse.json({ success: true, conversation: conv });
    }
  } catch (error) {
    console.error('Create conversation API error:', error);
    return NextResponse.json({ error: 'Failed to initialize conversation' }, { status: 500 });
  }
}
