import { Context } from 'hono';
import { getDb } from '../lib/db';
import { ChallengeRepository } from '../repositories/challenge.repository';
import { ChallengeService } from '../services/challenge.service';
import { Env } from '../types';

export class ChallengeController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new ChallengeService(new ChallengeRepository(db));
  }

  // GET /api/v1/challenges
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const service = this.getService(c);
      const challenges = await service.listChallenges(user?.athleteId);
      return c.json({ challenges, count: challenges.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // GET /api/v1/challenges/:id
  async getDetail(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Challenge ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      const result = await service.getChallengeDetail(id, user?.athleteId);
      if (!result) return c.json({ error: 'Challenge not found' }, 404);

      return c.json(result);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/challenges/:id/join
  async toggleJoin(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Challenge ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      const result = await service.toggleJoin(id, user.athleteId);
      return c.json({
        message: result.isJoined ? 'Joined challenge!' : 'Left challenge',
        ...result,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // POST /api/v1/challenges
  async create(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      if (!body.title || !body.targetMeters) {
        return c.json({ error: 'Title and target distance (meters) are required' }, 400);
      }

      const service = this.getService(c);
      const challenge = await service.createChallenge(user.athleteId, body);

      return c.json({ message: 'Challenge created', challenge }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }
}
