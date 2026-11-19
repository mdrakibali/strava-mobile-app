import { Context } from 'hono';
import { getDb } from '../lib/db';
import { ClubRepository } from '../repositories/club.repository';
import { ClubService } from '../services/club.service';
import { Env } from '../types';

export class ClubController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
    return new ClubService(new ClubRepository(db));
  }

  // GET /api/v1/clubs
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const q = c.req.query('q');
      const onlyJoined = c.req.query('filter') === 'my';

      const service = this.getService(c);
      const clubs = await service.listClubs(q, user?.athleteId, onlyJoined);

      return c.json({ clubs, count: clubs.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // GET /api/v1/clubs/:id
  async getDetail(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Club ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);
      const detail = await service.getClubDetail(id, user?.athleteId);

      if (!detail) return c.json({ error: 'Club not found' }, 404);
      return c.json(detail);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/clubs
  async create(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json();

      if (!body.name || !body.name.trim()) {
        return c.json({ error: 'Club name is required' }, 400);
      }

      const service = this.getService(c);
      const club = await service.createClub(user.athleteId, body);

      return c.json({ message: 'Club created', club }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // POST /api/v1/clubs/:id/join
  async toggleMembership(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Club ID is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);
      const result = await service.toggleMembership(id, user.athleteId);

      return c.json({
        message: result.isMember ? 'Joined club' : 'Left club',
        ...result,
      });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }
}
