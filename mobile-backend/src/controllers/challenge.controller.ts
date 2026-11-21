import { Context } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { parseBody } from '../lib/http';
import { ChallengeRepository } from '../repositories/challenge.repository';
import { ChallengeService } from '../services/challenge.service';
import { Env } from '../types';

const isoDate = z.string().datetime({ offset: true });
const fields = {
  title: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).nullish(),
  sportType: z.enum(['Run', 'Walk', 'Hike', 'Ride']),
  targetMeters: z.coerce.number().finite().positive().max(10_000_000),
  startDate: isoDate,
  endDate: isoDate,
};
const createSchema = z.object({ ...fields, sportType: fields.sportType.default('Run'), startDate: fields.startDate.optional(), endDate: fields.endDate.optional() });
const updateSchema = z.object(fields).partial();

// Errors are HttpError instances and are turned into JSON (with the right status) by app.onError.
export class ChallengeController {
  private getService(c: Context<{ Bindings: Env }>) {
    return new ChallengeService(new ChallengeRepository(getDb(c)));
  }

  // GET /api/v1/challenges
  async list(c: Context<{ Bindings: Env }>) {
    const challenges = await this.getService(c).listChallenges(c.get('user')?.athleteId);
    return c.json({ challenges, count: challenges.length });
  }

  // GET /api/v1/challenges/:id
  async getDetail(c: Context<{ Bindings: Env }>) {
    const result = await this.getService(c).getChallengeDetail(c.req.param('id') ?? '', c.get('user')?.athleteId);
    if (!result) return c.json({ error: 'Challenge not found', code: 'not_found' }, 404);
    return c.json(result);
  }

  // POST /api/v1/challenges/:id/join   body: { join?: boolean }
  async toggleJoin(c: Context<{ Bindings: Env }>) {
    const raw = await c.req.json().catch(() => ({}));
    const join = typeof raw?.join === 'boolean' ? raw.join : undefined;
    const result = await this.getService(c).setJoin(c.req.param('id') ?? '', c.get('user').athleteId, join);
    return c.json({ message: result.isJoined ? 'Joined challenge!' : 'Left challenge', ...result });
  }

  // POST /api/v1/challenges
  async create(c: Context<{ Bindings: Env }>) {
    const body = await parseBody(c, createSchema);
    const challenge = await this.getService(c).createChallenge(c.get('user').athleteId, body);
    return c.json({ message: 'Challenge created', challenge }, 201);
  }

  // PATCH /api/v1/challenges/:id (creator)
  async update(c: Context<{ Bindings: Env }>) {
    const body = await parseBody(c, updateSchema);
    const challenge = await this.getService(c).updateChallenge(c.req.param('id') ?? '', c.get('user').athleteId, body);
    return c.json({ message: 'Challenge updated', challenge });
  }

  // DELETE /api/v1/challenges/:id (creator)
  async remove(c: Context<{ Bindings: Env }>) {
    await this.getService(c).deleteChallenge(c.req.param('id') ?? '', c.get('user').athleteId);
    return c.json({ message: 'Challenge deleted' });
  }
}
