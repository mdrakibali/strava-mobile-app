import { beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, seedAthlete } from './harness';

let db: AppDatabase;
let call: ReturnType<typeof createTestApp>['call'];
let a: string;
let b: string;

beforeEach(async () => {
  ({ db } = await createTestDb());
  ({ call } = createTestApp(db));
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
});

describe('direct messages', () => {
  it('creates one conversation for a pair, from either side, and rejects self-messaging', async () => {
    const created = await call('POST', '/messages/conversations', {
      token: b,
      body: { targetUserId: 'ath_a' },
    });
    expect(created.status).toBe(200);
    expect(created.body.created).toBe(true);
    const again = await call('POST', '/messages/conversations', {
      token: b,
      body: { targetUserId: 'ath_a' },
    });
    expect(again.body.created).toBe(false);
    expect(again.body.conversation.id).toBe(created.body.conversation.id);
    const otherWay = await call('POST', '/messages/conversations', {
      token: a,
      body: { targetUserId: 'ath_b' },
    });
    expect(otherWay.body.conversation.id).toBe(created.body.conversation.id);
    expect(
      (await call('POST', '/messages/conversations', { token: b, body: { targetUserId: 'ath_b' } }))
        .status
    ).toBe(422);
    expect(
      (
        await call('POST', '/messages/conversations', {
          token: b,
          body: { targetUserId: 'missing' },
        })
      ).status
    ).toBe(404);
  });

  it('does not create a second conversation when both sides open at once', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        call('POST', '/messages/conversations', {
          token: i % 2 === 0 ? a : b,
          body: { targetUserId: i % 2 === 0 ? 'ath_b' : 'ath_a' },
        })
      )
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(new Set(results.map((r) => r.body.conversation.id)).size).toBe(1);
  });

  it('persists a message on the shared thread and counts it unread for the recipient', async () => {
    const opened = await call('POST', '/messages/conversations', {
      token: b,
      body: { targetUserId: 'ath_a' },
    });
    const sent = await call('POST', '/messages/send', {
      token: b,
      body: { recipientId: 'ath_a', text: 'hi' },
    });
    expect(sent.status).toBe(201);
    expect(sent.body.chatId).toBe(opened.body.conversation.id);
    expect(sent.body.directMessage.senderId).toBe('ath_b');
    const thread = await call('GET', `/messages/${opened.body.conversation.id}`, { token: a });
    expect(thread.status).toBe(200);
    expect(thread.body.messages.map((m: any) => m.text)).toEqual(['hi']);
    const beforeRead = await call('GET', '/messages/conversations', { token: a });
    // Opening the thread above marked it read. Send another and check the list before opening.
    await call('POST', '/messages/send', {
      token: b,
      body: { recipientId: 'ath_a', text: 'again' },
    });
    const list = await call('GET', '/messages/conversations', { token: a });
    expect(list.body.conversations).toHaveLength(1);
    expect(list.body.conversations[0].unreadCount).toBe(1);
    expect(list.body.conversations[0].lastMessage).toBe('again');
    expect(beforeRead.body.conversations[0].id).toBe(list.body.conversations[0].id);
    const byChat = await call('POST', '/messages/send', {
      token: b,
      body: { recipientId: opened.body.conversation.id, text: 'via chat id' },
    });
    expect(byChat.status).toBe(201);
    expect(byChat.body.directMessage.text).toBe('via chat id');
    expect(byChat.body.chatId).toBe(opened.body.conversation.id);
    const missing = await call('POST', '/messages/send', {
      token: b,
      body: { recipientId: 'nobody', text: 'x' },
    });
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('recipient_not_found');
    expect(missing.body.error).not.toBe('Endpoint Not Found');
    expect(
      (await call('GET', `/messages/${opened.body.conversation.id}`, { token: b })).status
    ).toBe(200);
    expect(
      (
        await call('GET', `/messages/${opened.body.conversation.id}`, {
          token: await seedAthlete(db, 'ath_c'),
        })
      ).status
    ).toBe(403);
  });
});
