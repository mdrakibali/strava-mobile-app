import { beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../lib/db';
import { createTestApp, createTestDb, ENV, seedAthlete } from './harness';

let db: AppDatabase;
let a: string;
let b: string;
let forwarded: string[];
let broadcasts: any[];

/** Stand-in for the ChatRoom Durable Object binding: records what the Worker forwards to it. */
const fakeRoom = () => ({
  idFromName: (n: string) => n,
  get: () => ({
    fetch: async (input: any, init?: any) => {
      if (typeof input === 'string') {
        broadcasts.push(JSON.parse(init.body));
        return new Response('{}');
      }
      forwarded.push(input.url);
      return new Response('ok');
    },
  }),
});

beforeEach(async () => {
  ({ db } = await createTestDb());
  a = await seedAthlete(db, 'ath_a');
  b = await seedAthlete(db, 'ath_b');
  forwarded = [];
  broadcasts = [];
});

describe('realtime socket authentication', () => {
  it('rejects a socket without a valid token (it used to receive every private message)', async () => {
    const { call } = createTestApp(db, { ...ENV, CHAT_ROOM: fakeRoom() } as any);
    expect((await call('GET', '/messages/ws')).status).toBe(401);
    expect((await call('GET', '/messages/ws?token=garbage')).status).toBe(401);
    expect(forwarded).toHaveLength(0);
  });

  it('ignores a client-supplied athleteId and forwards only the verified one, without the token', async () => {
    const { call } = createTestApp(db, { ...ENV, CHAT_ROOM: fakeRoom() } as any);
    await call('GET', `/messages/ws?token=${a}&athleteId=ath_victim`);
    expect(forwarded).toHaveLength(1);
    const url = new URL(forwarded[0]);
    expect(url.searchParams.get('athleteId')).toBe('ath_a');
    expect(url.searchParams.get('token')).toBeNull();
  });

  it('broadcasts a sent message and a notification event only addressed to athletes', async () => {
    const { call } = createTestApp(db, { ...ENV, CHAT_ROOM: fakeRoom() } as any);
    const res = await call('POST', '/messages/send', {
      token: a,
      body: { recipientId: 'ath_b', text: 'hi' },
    });
    expect(res.status).toBe(201);
    expect(broadcasts.map((x) => x.type)).toEqual(['new_message', 'notification']);
    expect(broadcasts[1].recipientId).toBe('ath_b');
  });
});
