import { NotificationRepository } from '../repositories/notification.repository';

export class NotificationService {
  constructor(private notifRepo: NotificationRepository) {}

  async getNotifications(recipientId: string, limit = 30) {
    return this.notifRepo.listByRecipient(recipientId, limit);
  }

  async markAsRead(id: string, recipientId: string) {
    await this.notifRepo.markAsRead(id, recipientId);
  }

  async markAllAsRead(recipientId: string) {
    await this.notifRepo.markAllAsRead(recipientId);
  }
}
