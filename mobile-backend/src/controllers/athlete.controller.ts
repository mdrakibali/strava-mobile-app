import { Context } from 'hono';
import { getDb } from '../lib/db';
import { AthleteRepository } from '../repositories/athlete.repository';
import { Env } from '../types';

export class AthleteController {
  private getRepo(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
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

      const formatted = list.map(({ passwordHash: _, ...a }) => ({
        ...a,
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
      const recentActivities = await repo.getRecentActivities(id, 10);

      const { passwordHash: _, ...safeAthlete } = athlete;

      return c.json({
        athlete: {
          ...safeAthlete,
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
      }

      const followersCount = await repo.getFollowersCount(targetId);

      return c.json({
        message: !isFollowing ? 'Followed athlete' : 'Unfollowed athlete',
        isFollowing: !isFollowing,
        followersCount,
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

      const { passwordHash: _, ...safeAthlete } = updated;
      return c.json({ message: 'Profile updated', athlete: safeAthlete });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }
}
