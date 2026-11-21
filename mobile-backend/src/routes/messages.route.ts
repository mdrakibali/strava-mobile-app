import { and, desc, eq, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, chats, directMessages } from '../db/schema';
import { verifyToken } from '../lib/auth';
import { getDb } from '../lib/db';
import { NotificationRepository } from '../repositories/notification.repository';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const messagesRouter = new Hono<{ Bindings: Env }>();

export function getChatId(a: string, b: string): string {
  const [first, second] = [a, b].sort();
  return `chat_${first}_${second}`;
}

// GET /api/v1/messages/ws (WebSocket upgrade endpoint)
messagesRouter.get('/ws', async (c) => {
  if (!c.env.CHAT_ROOM) return c.json({ error: 'ChatRoom not configured' }, 503);
  const token = c.req.query('token');
  let athleteId = '';
  if (token && c.env.JWT_SECRET) {
    try {
      const user = await verifyToken(token, c.env.JWT_SECRET);
      if (user?.athleteId) athleteId = user.athleteId;
    } catch {}
  }
  const id = c.env.CHAT_ROOM.idFromName('global_chat');
  const targetUrl = new URL(c.req.url);
  if (athleteId) targetUrl.searchParams.set('athleteId', athleteId);
  return c.env.CHAT_ROOM.get(id).fetch(new Request(targetUrl.toString(), c.req.raw));
});

// GET /api/v1/messages/conversations
messagesRouter.get('/conversations', requireAuth, async (c) => {
  try {
    const myId = c.get('user').athleteId;
    const db = getDb(c);

    const userChats = await db.select().from(chats)
      .where(or(eq(chats.athlete1Id, myId), eq(chats.athlete2Id, myId)))
      .orderBy(desc(chats.lastMessageAt));

    const allAthletes = await db.select({
      id: athletes.id, displayName: athletes.displayName, username: athletes.username, avatarUrl: athletes.avatarUrl,
    }).from(athletes);
    const athleteMap = new Map(allAthletes.map((a) => [a.id, a]));

    const convList = await Promise.all(userChats.map(async (ch) => {
      const partnerId = ch.athlete1Id === myId ? ch.athlete2Id : ch.athlete1Id;
      const partner = athleteMap.get(partnerId) || {
        id: partnerId, displayName: 'Athlete', username: 'athlete',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      };
      const unread = await db.select({ id: directMessages.id }).from(directMessages)
        .where(and(eq(directMessages.chatId, ch.id), eq(directMessages.recipientId, myId), eq(directMessages.isRead, false)));
      return {
        id: ch.id, chatId: ch.id, participant: partner,
        lastMessage: ch.lastMessage || '', lastMessageTime: ch.lastMessageAt, unreadCount: unread.length,
      };
    }));
    return c.json({ conversations: convList });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch conversations' }, 500);
  }
});

// GET /api/v1/messages/:idOrParticipantId
messagesRouter.get('/:idOrParticipantId', requireAuth, async (c) => {
  try {
    const myId = c.get('user').athleteId;
    const rawParam = c.req.param('idOrParticipantId');
    if (!rawParam) return c.json({ error: 'param is required' }, 400);

    const db = getDb(c);
    let partnerId = rawParam;
    if (partnerId.startsWith('chat_')) {
      const parts = partnerId.replace(/^chat_/, '').split('_');
      partnerId = parts[0] === myId ? parts.slice(1).join('_') : parts[0];
    } else if (partnerId.startsWith('conv_')) {
      partnerId = partnerId.replace(/^conv_/, '');
    }
    if (partnerId === 'ath_seed_ahmed') partnerId = 'ath_seed_tanvir';

    const [partner] = await db.select({
      id: athletes.id, displayName: athletes.displayName, username: athletes.username, avatarUrl: athletes.avatarUrl,
    }).from(athletes).where(or(eq(athletes.id, partnerId), eq(athletes.username, partnerId))).limit(1);

    const actualPartnerId = partner ? partner.id : partnerId;
    const computedChatId = getChatId(myId, actualPartnerId);

    // Mark partner's unread messages to me as read
    await db.update(directMessages).set({ isRead: true }).where(
      or(
        and(eq(directMessages.chatId, computedChatId), eq(directMessages.recipientId, myId)),
        and(eq(directMessages.senderId, actualPartnerId), eq(directMessages.recipientId, myId))
      )
    );

    const msgs = await db.select({
      id: directMessages.id, chatId: directMessages.chatId, senderId: directMessages.senderId,
      recipientId: directMessages.recipientId, text: directMessages.text, isRead: directMessages.isRead, createdAt: directMessages.createdAt,
    }).from(directMessages).where(
      or(
        eq(directMessages.chatId, computedChatId),
        and(eq(directMessages.senderId, myId), eq(directMessages.recipientId, actualPartnerId)),
        and(eq(directMessages.senderId, actualPartnerId), eq(directMessages.recipientId, myId))
      )
    ).orderBy(directMessages.createdAt);

    return c.json({
      chatId: computedChatId,
      partner: partner || { id: actualPartnerId, displayName: 'Athlete', username: 'athlete' },
      messages: msgs,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch messages' }, 500);
  }
});

// POST /api/v1/messages/send
messagesRouter.post('/send', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const myId = user.athleteId;
    let { recipientId, chatId, text } = await c.req.json();
    if (!text?.trim()) return c.json({ error: 'Message text is required' }, 400);

    const db = getDb(c);
    let targetRecipientId = recipientId;
    if (!targetRecipientId && chatId?.startsWith('chat_')) {
      const parts = chatId.replace(/^chat_/, '').split('_');
      targetRecipientId = parts[0] === myId ? parts.slice(1).join('_') : parts[0];
    }
    if (targetRecipientId === 'ath_seed_ahmed') targetRecipientId = 'ath_seed_tanvir';

    const [recipient] = await db.select({ id: athletes.id, displayName: athletes.displayName, username: athletes.username })
      .from(athletes).where(or(eq(athletes.id, targetRecipientId), eq(athletes.username, targetRecipientId))).limit(1);
    if (!recipient) return c.json({ error: 'Recipient athlete not found' }, 404);

    const actualRecipientId = recipient.id;
    const activeChatId = chatId || getChatId(myId, actualRecipientId);
    const now = new Date();
    const [ath1, ath2] = [myId, actualRecipientId].sort();

    await db.insert(chats).values({
      id: activeChatId, athlete1Id: ath1, athlete2Id: ath2,
      lastMessage: text.trim(), lastMessageAt: now, createdAt: now, updatedAt: now,
    }).onConflictDoUpdate({
      target: chats.id,
      set: { lastMessage: text.trim(), lastMessageAt: now, updatedAt: now },
    });

    const newMsg = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chatId: activeChatId,
      senderId: myId,
      recipientId: actualRecipientId,
      text: text.trim(),
      isRead: false,
      createdAt: now,
    };
    await db.insert(directMessages).values(newMsg);

    try {
      const notifRepo = new NotificationRepository(db);
      await notifRepo.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: actualRecipientId,
        actorId: myId,
        actionType: 'MESSAGE',
        message: `${user.username || 'An athlete'} sent you a message: "${text.trim().slice(0, 45)}"`,
      });
    } catch {}

    if (c.env.CHAT_ROOM) {
      try {
        const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName('global_chat'));
        await stub.fetch('http://internal/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'new_message', directMessage: newMsg, chatId: activeChatId }),
        });
      } catch {}
    }

    return c.json({ message: 'Message sent successfully', directMessage: newMsg, chatId: activeChatId }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to send message' }, 500);
  }
});
