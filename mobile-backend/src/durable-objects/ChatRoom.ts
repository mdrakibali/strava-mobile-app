import { verifyToken } from '../lib/auth';
import { Env } from '../types';

interface SessionMeta {
  athleteId?: string;
}

export class ChatRoom {
  private state: any;
  private env: Env;
  private sessions = new Map<WebSocket, SessionMeta>();

  constructor(state: any, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      (server as any).accept();

      let athleteId: string | undefined;
      const token = url.searchParams.get('token');
      if (token && this.env.JWT_SECRET) {
        const user = await verifyToken(token, this.env.JWT_SECRET);
        if (user) athleteId = user.athleteId;
      }

      const meta: SessionMeta = { athleteId };
      this.sessions.set(server, meta);

      server.addEventListener('message', async (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : null;
          if (!data) return;

          if (data.type === 'auth' && data.token && this.env.JWT_SECRET) {
            const user = await verifyToken(data.token, this.env.JWT_SECRET);
            if (user) meta.athleteId = user.athleteId;
          } else if (data.type === 'typing' && meta.athleteId && data.recipientId) {
            this.broadcastToAthlete(data.recipientId, {
              type: 'typing',
              senderId: meta.athleteId,
            });
          } else if (data.type === 'ping') {
            server.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.warn('WebSocket message error:', err);
        }
      });

      const cleanup = () => {
        this.sessions.delete(server);
      };

      server.addEventListener('close', cleanup);
      server.addEventListener('error', cleanup);

      return new Response(null, { status: 101, webSocket: client });
    }

    // Handle internal broadcast from API workers
    if (request.method === 'POST') {
      try {
        const body = (await request.json()) as any;
        let delivered = 0;

        if (body.type === 'new_message' && body.directMessage) {
          const { recipientId, senderId } = body.directMessage;
          delivered += this.broadcastToAthlete(recipientId, body);
          delivered += this.broadcastToAthlete(senderId, body);
        } else if (body.type === 'notification' && body.recipientId) {
          delivered += this.broadcastToAthlete(body.recipientId, body);
        }

        return new Response(JSON.stringify({ ok: true, delivered }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    return new Response('Not found', { status: 404 });
  }

  private broadcastToAthlete(athleteId: string, payload: any): number {
    let count = 0;
    const msg = JSON.stringify(payload);
    for (const [ws, meta] of this.sessions.entries()) {
      if (meta.athleteId === athleteId) {
        try {
          ws.send(msg);
          count++;
        } catch {
          this.sessions.delete(ws);
        }
      }
    }
    return count;
  }
}

