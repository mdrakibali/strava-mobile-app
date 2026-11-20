import { and, desc, eq } from 'drizzle-orm';
import { athletes, notifications } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class NotificationRepository {
  constructor(private db: AppDatabase) {}

  async listByRecipient(recipientId: string, limit = 30) {
    return this.db
      .select({
        id: notifications.id,
        actionType: notifications.actionType,
        targetActivityId: notifications.targetActivityId,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        actor: {
          id: athletes.id,
          username: athletes.username,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(notifications)
      .innerJoin(athletes, eq(notifications.actorId, athletes.id))
      .where(eq(notifications.recipientId, recipientId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async create(data: typeof notifications.$inferInsert) {
    const [created] = await this.db.insert(notifications).values(data).returning();
    return created;
  }

  async markAsRead(id: string, recipientId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.recipientId, recipientId)));
  }

  async markAllAsRead(recipientId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.recipientId, recipientId));
  }
}

