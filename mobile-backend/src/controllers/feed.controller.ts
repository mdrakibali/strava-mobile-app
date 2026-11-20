import { Context } from 'hono';
import { getDb } from '../lib/db';
import { ActivityRepository } from '../repositories/activity.repository';
import { AthleteRepository } from '../repositories/athlete.repository';
import { ClubRepository } from '../repositories/club.repository';
import { FeedRepository } from '../repositories/feed.repository';
import { FeedService } from '../services/feed.service';
import { Env } from '../types';

export class FeedController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new FeedService(
      new FeedRepository(db),
      new ActivityRepository(db),
      new AthleteRepository(db),
      new ClubRepository(db)
    );
  }

  // GET /api/v1/feed
  async getFeed(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const tab = c.req.query('tab') as 'following' | 'all' | 'clubs' | undefined;
      const cursor = c.req.query('cursor');
      const limit = Number(c.req.query('limit')) || 15;

      const service = this.getService(c);
      const result = await service.getFeed({
        tab,
        cursor,
        limit,
        currentUserId: user?.athleteId,
      });

      return c.json(result);
    } catch (err: any) {
      console.error('Feed controller error:', err);
      return c.json({ error: err.message || 'Failed to fetch timeline feed' }, 500);
    }
  }
}

