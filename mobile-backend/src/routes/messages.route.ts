import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, chats, directMessages } from '../db/schema';
import { verifyToken } from '../lib/auth';
import { getDb, AppDatabase } from '../lib/db';
import { NotificationRepository } from '../repositories/notification.repository';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const messagesRouter = new Hono<{ Bindings: Env }>();

const partnerColumns = {
  id: athletes.id,
  displayName: athletes.displayName,
  username: athletes.username,
  avatarUrl: athletes.avatarUrl,
};

export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function getChatId(a: string, b: string): string {
  const [first, second] = canonicalPair(a, b);
  return `chat_${first}_${second}`;
}

type Partner = { id: string; displayName: string; username: string; avatarUrl: string | null };

/**
 * One direct conversation per athlete pair. The id is derived from the sorted ids, and the
 * unique (athlete1, athlete2) constraint plus ON CONFLICT makes concurrent creates return the
 * same row instead of a duplicate.
 */
export async function getOrCreateConversation(db: AppDatabase, myId: string, targetId: string) {
  if (!targetId || myId === targetId) return { error: 'self' as const };
  const [partner] = await db.select(partnerColumns).from(athletes).where(eq(athletes.id, targetId)).limit(1);
  if (!partner) return { error: 'not_found' as const };

  const [ath1, ath2] = canonicalPair(myId, partner.id);
  const pairWhere = or(
    and(eq(chats.athlete1Id, ath1), eq(chats.athlete2Id, ath2)),
    and(eq(chats.athlete1Id, ath2), eq(chats.athlete2Id, ath1))
  );
  const [existing] = await db.select().from(chats).where(pairWhere).limit(1);
  if (existing) return { chat: existing, partner, created: false };

  const now = new Date();
  const id = getChatId(myId, partner.id);
  const inserted = await db
    .insert(chats)
    .values({
      id,
      athlete1Id: ath1,
      athlete2Id: ath2,
      lastMessage: null,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return { chat: inserted[0], partner, created: true };

  const [again] = await db.select().from(chats).where(pairWhere).limit(1);
  if (!again) return { error: 'not_found' as const };
  return { chat: again, partner, created: false };
}

function conversationJson(chat: typeof chats.$inferSelect, partner: Partner, unreadCount = 0) {
  return {
    id: chat.id,
    chatId: chat.id,
    participant: partner,
    lastMessage: chat.lastMessage || '',
    lastMessageTime: chat.lastMessageAt,
    unreadCount,
    created: undefined as boolean | undefined,
  };
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
    } catch {
      /* anonymous socket; broadcasts still require a verified athlete id */
    }
  }
  const id = c.env.CHAT_ROOM.idFromName('global_chat');
  const targetUrl = new URL(c.req.url);
  if (athleteId) targetUrl.searchParams.set('athleteId', athleteId);
  return c.env.CHAT_ROOM.get(id).fetch(new Request(targetUrl.toString(), c.req.raw));
});

// POST /api/v1/messages/conversations  { targetUserId } — open or create, never duplicate
messagesRouter.post('/conversations', requireAuth, async (c) => {
  const myId = c.get('user').athleteId;
  const body = await c.req.json().catch(() => ({}));
  const targetUserId = String(body?.targetUserId || '').trim();
  if (!targetUserId) return c.json({ error: 'targetUserId is required' }, 400);

  const db = getDb(c);
  const result = await getOrCreateConversation(db, myId, targetUserId);
  if ('error' in result && result.error === 'self') return c.json({ error: 'You cannot message yourself' }, 422);
  if ('error' in result) return c.json({ error: 'Athlete not found' }, 404);

  return c.json({
    conversation: { ...conversationJson(result.chat, result.partner), created: result.created },
    created: result.created,
  });
});

// GET /api/v1/messages/conversations
messagesRouter.get('/conversations', requireAuth, async (c) => {
  try {
    const myId = c.get('user').athleteId;
    const db = getDb(c);

    const userChats = await db
      .select()
      .from(chats)
      .where(or(eq(chats.athlete1Id, myId), eq(chats.athlete2Id, myId)))
      .orderBy(desc(chats.lastMessageAt));

    const partnerIds = userChats.map((ch) => (ch.athlete1Id === myId ? ch.athlete2Id : ch.athlete1Id));
    const partners = partnerIds.length
      ? await db.select(partnerColumns).from(athletes).where(inArray(athletes.id, partnerIds))
      : [];
    const athleteMap = new Map(partners.map((a) => [a.id, a]));

    const unreadRows = partnerIds.length
      ? await db
          .select({
            chatId: directMessages.chatId,
            n: sql<number>`count(*)::int`,
          })
          .from(directMessages)
          .where(and(eq(directMessages.recipientId, myId), eq(directMessages.isRead, false)))
          .groupBy(directMessages.chatId)
      : [];
    const unreadMap = new Map(unreadRows.map((r) => [r.chatId, Number(r.n)]));

    const convList = userChats.map((ch) => {
      const partnerId = ch.athlete1Id === myId ? ch.athlete2Id : ch.athlete1Id;
      const partner = athleteMap.get(partnerId) || {
        id: partnerId,
        displayName: 'Athlete',
        username: 'athlete',
        avatarUrl: null,
      };
      return conversationJson(ch, partner, unreadMap.get(ch.id) || 0);
    });
    return c.json({ conversations: convList });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch conversations' }, 500);
  }
});

async function resolveThread(db: AppDatabase, myId: string, rawParam: string) {
  if (rawParam.startsWith('chat_')) {
    const [chatRow] = await db.select().from(chats).where(eq(chats.id, rawParam)).limit(1);
    if (!chatRow) return { error: 'not_found' as const };
    if (chatRow.athlete1Id !== myId && chatRow.athlete2Id !== myId) return { error: 'forbidden' as const };
    const partnerId = chatRow.athlete1Id === myId ? chatRow.athlete2Id : chatRow.athlete1Id;
    const [partner] = await db.select(partnerColumns).from(athletes).where(eq(athletes.id, partnerId)).limit(1);
    if (!partner) return { error: 'not_found' as const };
    return { chat: chatRow, partner };
  }

  const [byName] = await db
    .select(partnerColumns)
    .from(athletes)
    .where(or(eq(athletes.id, rawParam), eq(athletes.username, rawParam)))
    .limit(1);
  if (!byName) return { error: 'not_found' as const };
  const opened = await getOrCreateConversation(db, myId, byName.id);
  if ('error' in opened) return opened;
  return { chat: opened.chat, partner: opened.partner };
}

// GET /api/v1/messages/:idOrParticipantId — loads the thread and creates it if this is a new pair
messagesRouter.get('/:idOrParticipantId', requireAuth, async (c) => {
  try {
    const myId = c.get('user').athleteId;
    const rawParam = c.req.param('idOrParticipantId');
    if (!rawParam) return c.json({ error: 'param is required' }, 400);

    const db = getDb(c);
    const resolved = await resolveThread(db, myId, rawParam);
    if ('error' in resolved && resolved.error === 'self') return c.json({ error: 'You cannot message yourself' }, 422);
    if ('error' in resolved && resolved.error === 'forbidden') return c.json({ error: 'You are not in this conversation' }, 403);
    if ('error' in resolved) return c.json({ error: 'Conversation not found' }, 404);

    const { chat, partner } = resolved;
    await db
      .update(directMessages)
      .set({ isRead: true })
      .where(and(eq(directMessages.chatId, chat.id), eq(directMessages.recipientId, myId), eq(directMessages.isRead, false)));

    const msgs = await db
      .select({
        id: directMessages.id,
        chatId: directMessages.chatId,
        senderId: directMessages.senderId,
        recipientId: directMessages.recipientId,
        text: directMessages.text,
        isRead: directMessages.isRead,
        createdAt: directMessages.createdAt,
      })
      .from(directMessages)
      .where(
        or(
          eq(directMessages.chatId, chat.id),
          and(eq(directMessages.senderId, myId), eq(directMessages.recipientId, partner.id)),
          and(eq(directMessages.senderId, partner.id), eq(directMessages.recipientId, myId))
        )
      )
      .orderBy(directMessages.createdAt);

    return c.json({ chatId: chat.id, partner, messages: msgs });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch messages' }, 500);
  }
});

// POST /api/v1/messages/send
messagesRouter.post('/send', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const myId = user.athleteId;
    const body = await c.req.json();
    const text = String(body?.text || '');
    if (!text.trim()) return c.json({ error: 'Message text is required' }, 400);

    const db = getDb(c);
    const rawRecipient = String(body?.recipientId || '').trim();
    const rawChat = String(body?.chatId || '').trim();
    // A conversation id is not an athlete. Resolving it here is what keeps
    // POST /messages/send from answering 404 when the client only has the thread id.
    const chatKey = rawChat || (rawRecipient.startsWith('chat_') ? rawRecipient : '');
    let targetId = chatKey && chatKey === rawRecipient ? '' : rawRecipient;
    if (chatKey) {
      const [chatRow] = await db.select().from(chats).where(eq(chats.id, chatKey)).limit(1);
      if (!chatRow || (chatRow.athlete1Id !== myId && chatRow.athlete2Id !== myId)) {
        return c.json({ error: 'Conversation not found', code: 'conversation_not_found' }, 404);
      }
      targetId = chatRow.athlete1Id === myId ? chatRow.athlete2Id : chatRow.athlete1Id;
    }
    if (!targetId) return c.json({ error: 'Recipient is required' }, 400);

    const [named] = await db
      .select({ id: athletes.id })
      .from(athletes)
      .where(or(eq(athletes.id, targetId), eq(athletes.username, targetId)))
      .limit(1);
    if (!named) return c.json({ error: 'Recipient athlete not found', code: 'recipient_not_found' }, 404);

    const opened = await getOrCreateConversation(db, myId, named.id);
    if ('error' in opened && opened.error === 'self') return c.json({ error: 'You cannot message yourself' }, 422);
    if ('error' in opened) return c.json({ error: 'Recipient athlete not found' }, 404);

    const now = new Date();
    const activeChatId = opened.chat.id;
    const trimmed = text.trim();
    await db
      .update(chats)
      .set({ lastMessage: trimmed, lastMessageAt: now, updatedAt: now })
      .where(eq(chats.id, activeChatId));

    const newMsg = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      chatId: activeChatId,
      senderId: myId,
      recipientId: opened.partner.id,
      text: trimmed,
      isRead: false,
      createdAt: now,
    };
    await db.insert(directMessages).values(newMsg);

    try {
      const notifRepo = new NotificationRepository(db);
      await notifRepo.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: opened.partner.id,
        actorId: myId,
        actionType: 'MESSAGE',
        message: `${user.username || 'An athlete'} sent you a message: "${trimmed.slice(0, 45)}"`,
      });
    } catch {
      /* a notification failure must not drop the message */
    }

    if (c.env.CHAT_ROOM) {
      try {
        const stub = c.env.CHAT_ROOM.get(c.env.CHAT_ROOM.idFromName('global_chat'));
        await stub.fetch('http://internal/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'new_message', directMessage: newMsg, chatId: activeChatId }),
        });
      } catch {
        /* durable object is production-only; the message is already stored */
      }
    }

    return c.json({ message: 'Message sent successfully', directMessage: newMsg, chatId: activeChatId }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to send message' }, 500);
  }
});
