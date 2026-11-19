import { Context } from 'hono';
import { getDb } from '../lib/db';
import { ActivityRepository } from '../repositories/activity.repository';
import { ChallengeRepository } from '../repositories/challenge.repository';
import { GearRepository } from '../repositories/gear.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { PrivacyZoneRepository } from '../repositories/privacy-zone.repository';
import { ActivityService } from '../services/activity.service';
import { Env } from '../types';

export class ActivityController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
    return new ActivityService(
      new ActivityRepository(db),
      new PrivacyZoneRepository(db),
      new ChallengeRepository(db),
      new GearRepository(db),
      new NotificationRepository(db)
    );
  }

  // POST /api/v1/activities
  async create(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      if (!body.title) {
        return c.json({ error: 'Activity title is required' }, 400);
      }

      const service = this.getService(c);
      const activity = await service.createActivity({
        ...body,
        athleteId: user.athleteId,
        athleteUsername: user.username,
      });

      return c.json({ message: 'Activity uploaded successfully', activity }, 201);
    } catch (err: any) {
      console.error('Activity create error:', err);
      return c.json({ error: err.message || 'Failed to save activity' }, 500);
    }
  }

  // GET /api/v1/activities/:id
  async getDetail(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Activity ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      const detail = await service.getActivityDetail(id, user?.athleteId);
      if (!detail) return c.json({ error: 'Activity not found' }, 404);

      return c.json(detail);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/activities/:id/kudos
  async toggleKudos(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Activity ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      const result = await service.toggleKudos(id, user.athleteId, user.username);
      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // POST /api/v1/activities/:id/comments
  async addComment(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Activity ID is required' }, 400);

      const user = c.get('user');
      const body = await c.req.json();

      if (!body.content || !body.content.trim()) {
        return c.json({ error: 'Comment content cannot be empty' }, 400);
      }

      const service = this.getService(c);
      const comment = await service.addComment(
        id,
        user.athleteId,
        user.username,
        body.content.trim(),
        body.parentCommentId
      );

      return c.json({ message: 'Comment posted', comment }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // GET /api/v1/activities/:id/export
  async exportGpx(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Activity ID is required' }, 400);

      const service = this.getService(c);
      const gpxXml = await service.generateGpx(id);

      if (!gpxXml) return c.json({ error: 'Activity not found' }, 404);

      return c.body(gpxXml, 200, {
        'Content-Type': 'application/gpx+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="activity_${id}.gpx"`,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }
}
