import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await context.params;

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { clientId: session.userId } : {}),
        ...(session.role === 'MEMBER' ? {
          OR: [
            { assignees: { some: { userId: session.userId } } },
            { projectManagerId: session.userId },
          ]
        } : {})
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const messages = await prisma.projectMessage.findMany({
      where: {
        projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { visibility: 'PUBLIC' } : {})
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        },
        mentions: {
          include: { mentionedUser: { select: { id: true, name: true } } }
        },
        taskMentions: {
          include: { task: { select: { id: true, title: true, statusId: true } } }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await context.params;
    const { content, visibility, mentions = [], taskMentions = [] } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { clientId: session.userId } : {}),
        ...(session.role === 'MEMBER' ? {
          OR: [
            { assignees: { some: { userId: session.userId } } },
            { projectManagerId: session.userId },
          ]
        } : {})
      },
      include: {
        client: { select: { id: true, name: true } }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const msgVisibility = session.role === 'CLIENT' ? 'PUBLIC' : (visibility || 'INTERNAL');

    const message = await prisma.projectMessage.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        senderId: session.userId,
        content,
        visibility: msgVisibility,
        mentions: {
          create: mentions.map((userId: string) => ({ mentionedUserId: userId }))
        },
        taskMentions: {
          create: taskMentions.map((taskId: string) => ({ taskId }))
        }
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
        taskMentions: { include: { task: { select: { id: true, title: true, statusId: true } } } }
      }
    });

    // Realtime Event
    emitAppEvent('message_sent', `project:${projectId}`, { message });

    // Send Notifications to mentioned users (async, don't await)
    if (mentions.length > 0) {
      for (const userId of mentions) {
        if (userId === session.userId) continue; // don't notify self
        prisma.notification.create({
          data: {
            organizationId: session.organizationId,
            projectId,
            recipientId: userId,
            actorId: session.userId,
            type: 'mention',
            title: 'You were mentioned',
            message: `${session.name} mentioned you in a message in ${project.name}`,
            actionUrl: `/workspace/projects/${projectId}?tab=conversation`
          }
        }).then(() => {
          emitAppEvent('notification_created', `user:${userId}`, { type: 'mention' });
        }).catch(console.error);
      }
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
