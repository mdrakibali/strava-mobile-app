import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getDb } from '../lib/db';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from '../services/notification.service';
import { Env } from '../types';

export class NotificationController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new NotificationService(new NotificationRepository(db));
  }

  // GET /api/v1/notifications
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const service = this.getService(c);
      const notifications = await service.getNotifications(user.athleteId);
      return c.json({ notifications, count: notifications.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // PATCH /api/v1/notifications/:id/read
  async markRead(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Notification ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      await service.markAsRead(id, user.athleteId);
      return c.json({ message: 'Marked as read' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/notifications/read-all
  async markAllRead(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const service = this.getService(c);

      await service.markAllAsRead(user.athleteId);
      return c.json({ message: 'All notifications marked as read' });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // GET /api/v1/notifications/stream (Real-Time Server-Sent Events)
  async stream(c: Context<{ Bindings: Env }>) {
    const user = c.get('user');
    const db = getDb(c);
    const repo = new NotificationRepository(db);

    return streamSSE(c, async (stream) => {
      // Send initial notifications on connection open
      const list = await repo.listByRecipient(user.athleteId, 15);
      await stream.writeSSE({
        data: JSON.stringify({ notifications: list, count: list.length }),
        event: 'initial',
        id: String(Date.now()),
      });

      // Send connection ping heartbeat
      await stream.writeSSE({
        data: JSON.stringify({ status: 'connected', athleteId: user.athleteId, timestamp: Date.now() }),
        event: 'heartbeat',
      });
    });
  }
}
