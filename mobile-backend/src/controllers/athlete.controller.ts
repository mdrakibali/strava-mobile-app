import { Context } from 'hono';
import { decodeCursor, encodeCursor } from '../lib/cursor';
import { getDb } from '../lib/db';
import { toActivityListItem, toPrivateAthlete, toPublicAthlete } from '../lib/dto';
import { HttpError } from '../lib/http';
import { ActivityRepository } from '../repositories/activity.repository';
import { AthleteRepository } from '../repositories/athlete.repository';
import { SocialService } from '../services/social.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { Env } from '../types';

export class AthleteController {
  private getRepo(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new AthleteRepository(db);
  }

  // GET /api/v1/athletes/search
  async search(c: Context<{ Bindings: Env }>) {
    try {
      const q = c.req.query('q') || '';
      const currentUser = c.get('user');
      const repo = this.getRepo(c);

      const list = await repo.search(q);
      const followedIds = currentUser ? await repo.getFollowedIds(currentUser.athleteId) : [];
      const followedSet = new Set(followedIds);

      const formatted = list
        .filter((a) => !currentUser || a.id !== currentUser.athleteId)
        .map((a) => ({
          ...toPublicAthlete(a),
          isFollowing: followedSet.has(a.id),
        }));

      return c.json({ athletes: formatted, count: formatted.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // GET /api/v1/athletes/:id
  async getProfile(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Athlete ID is required' }, 400);

      const currentUser = c.get('user');
      const repo = this.getRepo(c);

      const athlete = await repo.findById(id);
      if (!athlete) return c.json({ error: 'Athlete not found' }, 404);

      const followersCount = await repo.getFollowersCount(id);
      const followingCount = await repo.getFollowingCount(id);
      const isFollowing = currentUser ? await repo.isFollowing(currentUser.athleteId, id) : false;
      // Policy-filtered (ONLY_ME / FOLLOWERS_ONLY respected) and without the raw track (PRIV-02/03).
      const rows = await new ActivityRepository(getDb(c)).listVisibleByAthlete(id, currentUser?.athleteId, 10, null);
      const recentActivities = rows.slice(0, 10).map(toActivityListItem);
      const isSelf = currentUser?.athleteId === id;

      return c.json({
        athlete: {
          ...(isSelf ? toPrivateAthlete(athlete) : toPublicAthlete(athlete)),
          followersCount,
          followingCount,
          isFollowing,
        },
        recentActivities,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // GET /api/v1/athletes/:id/activities?cursor=&limit= — activity history (policy-filtered)
  async listActivities(c: Context<{ Bindings: Env }>) {
    const id = c.req.param('id');
    if (!id) throw new HttpError(400, 'missing_param', 'Athlete ID is required');
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20));
    const rawCursor = c.req.query('cursor');
    const cursor = decodeCursor(rawCursor);
    if (rawCursor && !cursor) throw new HttpError(400, 'invalid_cursor', 'Invalid cursor');
    const viewer = c.get('user')?.athleteId;
    const rows = await new ActivityRepository(getDb(c)).listVisibleByAthlete(id, viewer, limit, cursor);
    const hasNextPage = rows.length > limit;
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return c.json({
      activities: items.map(toActivityListItem),
      hasNextPage,
      nextCursor: hasNextPage && last ? encodeCursor(last.startTime, last.id) : null,
    });
  }

  // POST /api/v1/athletes/:id/follow
  async toggleFollow(c: Context<{ Bindings: Env }>) {
    try {
      const targetId = c.req.param('id');
      if (!targetId) return c.json({ error: 'Target Athlete ID is required' }, 400);

      const currentUser = c.get('user');

      if (currentUser.athleteId === targetId) {
        return c.json({ error: 'You cannot follow yourself' }, 400);
      }

      const repo = this.getRepo(c);
      const isFollowing = await repo.isFollowing(currentUser.athleteId, targetId);

      if (isFollowing) {
        await repo.unfollow(currentUser.athleteId, targetId);
      } else {
        await repo.follow(currentUser.athleteId, targetId);
        try {
          const db = getDb(c);
          const notifRepo = new NotificationRepository(db);
          await notifRepo.create({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            recipientId: targetId,
            actorId: currentUser.athleteId,
            actionType: 'FOLLOW',
            message: `${currentUser.username || 'An athlete'} started following you!`,
          });
        } catch (notifErr) {
          console.warn('Failed to send follow notification:', notifErr);
        }
      }

      const followersCount = await repo.getFollowersCount(targetId);
      const followingCount = await repo.getFollowingCount(currentUser.athleteId);

      return c.json({
        message: !isFollowing ? 'Followed athlete' : 'Unfollowed athlete',
        isFollowing: !isFollowing,
        followersCount,
        followingCount,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // PUT /api/v1/athletes/me
  async updateProfile(c: Context<{ Bindings: Env }>) {
    try {
      const currentUser = c.get('user');
      const body = await c.req.json();
      const repo = this.getRepo(c);

      const updated = await repo.update(currentUser.athleteId, {
        displayName: body.displayName?.trim(),
        bio: body.bio?.trim(),
        city: body.city?.trim(),
        country: body.country?.trim(),
        weightKg: body.weightKg ? String(body.weightKg) : undefined,
        heightCm: body.heightCm ? String(body.heightCm) : undefined,
        maxHr: body.maxHr ? Number(body.maxHr) : undefined,
        restingHr: body.restingHr ? Number(body.restingHr) : undefined,
        ftpWatts: body.ftpWatts ? Number(body.ftpWatts) : undefined,
        avatarUrl: body.avatarUrl,
      });

      if (!updated) return c.json({ error: 'Failed to update profile' }, 400);

      return c.json({ message: 'Profile updated', athlete: toPrivateAthlete(updated) });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  private page(c: Context<{ Bindings: Env }>) {
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 30));
    const raw = c.req.query('cursor');
    const cursor = decodeCursor(raw);
    if (raw && !cursor) throw new HttpError(400, 'invalid_cursor', 'Invalid cursor');
    return { limit, cursor };
  }

  private targetId(c: Context<{ Bindings: Env }>) {
    const id = c.req.param('id');
    if (!id) throw new HttpError(400, 'missing_param', 'Athlete ID is required');
    return id;
  }

  // PUT /athletes/:id/follow (idempotent)
  async follow(c: Context<{ Bindings: Env }>) {
    const user = c.get('user');
    return c.json(await new SocialService(getDb(c)).follow(user.athleteId, user.username, this.targetId(c)));
  }

  // DELETE /athletes/:id/follow (idempotent)
  async unfollow(c: Context<{ Bindings: Env }>) {
    return c.json(await new SocialService(getDb(c)).unfollow(c.get('user').athleteId, this.targetId(c)));
  }

  // GET /athletes/:id/followers | /following
  async listFollows(c: Context<{ Bindings: Env }>, kind: 'followers' | 'following') {
    const { limit, cursor } = this.page(c);
    return c.json(await new SocialService(getDb(c)).list(kind, this.targetId(c), c.get('user')?.athleteId, limit, cursor));
  }

  // GET /athletes/:id/stats (policy-aware totals + 12 weeks)
  async stats(c: Context<{ Bindings: Env }>) {
    return c.json(await new SocialService(getDb(c)).stats(this.targetId(c), c.get('user')?.athleteId));
  }
}
