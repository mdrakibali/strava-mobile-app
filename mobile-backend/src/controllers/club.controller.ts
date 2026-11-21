import { Context } from 'hono';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { parseBody } from '../lib/http';
import { ClubRepository } from '../repositories/club.repository';
import { ClubService } from '../services/club.service';
import { Env } from '../types';

const clubFields = {
  name: z.string().trim().min(2).max(80),
  sportType: z.enum(['Run', 'Walk', 'Hike', 'Ride']),
  city: z.string().trim().max(100).nullish(),
  country: z.string().trim().max(100).nullish(),
  description: z.string().trim().max(1000).nullish(),
  isPrivate: z.boolean(),
};
const createSchema = z.object({ ...clubFields, sportType: clubFields.sportType.default('Run'), isPrivate: clubFields.isPrivate.default(false) });
const updateSchema = z.object(clubFields).partial();

// Errors are HttpError instances and are turned into JSON (with the right status) by app.onError.
export class ClubController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new ClubService(new ClubRepository(db));
  }

  // GET /api/v1/clubs
  async list(c: Context<{ Bindings: Env }>) {
    const user = c.get('user');
    const q = c.req.query('q');
    const onlyJoined = c.req.query('filter') === 'my';
    const clubs = await this.getService(c).listClubs(q, user?.athleteId, onlyJoined);
    return c.json({ clubs, count: clubs.length });
  }

  // GET /api/v1/clubs/:id
  async getDetail(c: Context<{ Bindings: Env }>) {
    const user = c.get('user');
    const detail = await this.getService(c).getClubDetail(c.req.param('id') ?? '', user?.athleteId);
    if (!detail) return c.json({ error: 'Club not found', code: 'not_found' }, 404);
    return c.json(detail);
  }

  // POST /api/v1/clubs
  async create(c: Context<{ Bindings: Env }>) {
    const body = await parseBody(c, createSchema);
    const club = await this.getService(c).createClub(c.get('user').athleteId, body);
    return c.json({ message: 'Club created', club }, 201);
  }

  // PATCH /api/v1/clubs/:id (owner or admin)
  async update(c: Context<{ Bindings: Env }>) {
    const body = await parseBody(c, updateSchema);
    const club = await this.getService(c).updateClub(c.req.param('id') ?? '', c.get('user').athleteId, body);
    return c.json({ message: 'Club updated', club });
  }

  // DELETE /api/v1/clubs/:id (owner)
  async remove(c: Context<{ Bindings: Env }>) {
    await this.getService(c).deleteClub(c.req.param('id') ?? '', c.get('user').athleteId);
    return c.json({ message: 'Club deleted' });
  }

  // POST /api/v1/clubs/:id/join   body: { join?: boolean }
  async toggleMembership(c: Context<{ Bindings: Env }>) {
    const raw = await c.req.json().catch(() => ({}));
    const join = typeof raw?.join === 'boolean' ? raw.join : undefined;
    const result = await this.getService(c).setMembership(c.req.param('id') ?? '', c.get('user').athleteId, join);
    return c.json({ message: result.isMember ? 'Joined club' : 'Left club', ...result });
  }
}
