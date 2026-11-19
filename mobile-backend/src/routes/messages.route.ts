import { and, desc, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, directMessages } from '../db/schema';
import { getDb } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const messagesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/messages/conversations
messagesRouter.get('/conversations', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const myId = user.athleteId;
    const db = getDb(c.env);

    // Fetch all messages where athlete is sender or recipient
    const allUserMessages = await db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        text: directMessages.text,
        isRead: directMessages.isRead,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(or(eq(directMessages.senderId, myId), eq(directMessages.recipientId, myId)))
      .orderBy(desc(directMessages.createdAt));

    // Group by other participant
    const conversationMap = new Map<string, any>();

    for (const msg of allUserMessages) {
      const partnerId = msg.senderId === myId ? msg.recipientId : msg.senderId;
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          participantId: partnerId,
          lastMessage: msg.text,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
        });
      }
      if (msg.recipientId === myId && !msg.isRead) {
        const item = conversationMap.get(partnerId);
        item.unreadCount += 1;
      }
    }

    const partnerIds = Array.from(conversationMap.keys());
    if (partnerIds.length === 0) {
      return c.json({ conversations: [] });
    }

    // Fetch athlete details for all partners
    const partners = await db
      .select({
        id: athletes.id,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
      })
      .from(athletes);

    const partnerMap = new Map(partners.map((p) => [p.id, p]));

    const result = partnerIds.map((pid) => {
      const conv = conversationMap.get(pid);
      const partner = partnerMap.get(pid) || {
        id: pid,
        displayName: 'Athlete',
        username: 'athlete',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      };
      return {
        id: `conv_${pid}`,
        participant: partner,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount,
      };
    });

    return c.json({ conversations: result });
  } catch (err: any) {
    console.error('Messages conversations error:', err);
    return c.json({ error: err.message || 'Failed to fetch conversations' }, 500);
  }
});

// GET /api/v1/messages/:participantId
messagesRouter.get('/:participantId', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const myId = user.athleteId;
    const partnerId = c.req.param('participantId');
    if (!partnerId) {
      return c.json({ error: 'participantId is required' }, 400);
    }
    const db = getDb(c.env);

    // Mark partner's unread messages to me as read
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.senderId, partnerId), eq(directMessages.recipientId, myId)));

    // Fetch conversation thread ordered chronologically
    const msgs = await db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        text: directMessages.text,
        isRead: directMessages.isRead,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, myId), eq(directMessages.recipientId, partnerId)),
          and(eq(directMessages.senderId, partnerId), eq(directMessages.recipientId, myId))
        )
      )
      .orderBy(directMessages.createdAt);

    return c.json({ messages: msgs });
  } catch (err: any) {
    console.error('Messages history error:', err);
    return c.json({ error: err.message || 'Failed to fetch messages' }, 500);
  }
});

// POST /api/v1/messages/send
messagesRouter.post('/send', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const myId = user.athleteId;
    const { recipientId, text } = await c.req.json();

    if (!recipientId || !text?.trim()) {
      return c.json({ error: 'recipientId and text are required' }, 400);
    }

    const db = getDb(c.env);
    const newMsg = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: myId,
      recipientId,
      text: text.trim(),
      isRead: false,
    };

    await db.insert(directMessages).values(newMsg);

    return c.json({ message: 'Message sent successfully', directMessage: newMsg }, 201);
  } catch (err: any) {
    console.error('Send message error:', err);
    return c.json({ error: err.message || 'Failed to send message' }, 500);
  }
});
