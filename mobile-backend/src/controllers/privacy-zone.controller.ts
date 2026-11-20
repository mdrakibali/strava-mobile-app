import { Context } from 'hono';
import { getDb } from '../lib/db';
import { PrivacyZoneRepository } from '../repositories/privacy-zone.repository';
import { Env } from '../types';

export class PrivacyZoneController {
  private getRepo(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    return new PrivacyZoneRepository(db);
  }

  // GET /api/v1/privacy-zones
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const repo = this.getRepo(c);
      const zones = await repo.findByAthlete(user.athleteId);

      const formatted = zones.map((z) => ({
        ...z,
        latitude: Number(z.latitude),
        longitude: Number(z.longitude),
      }));

      return c.json({ privacyZones: formatted, count: formatted.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/privacy-zones
  async create(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json();
      const repo = this.getRepo(c);

      const { name, latitude, longitude, radiusMeters = 500, isActive = true } = body;
      if (!name || latitude === undefined || longitude === undefined) {
        return c.json({ error: 'Name, latitude, and longitude are required' }, 400);
      }

      const id = `pz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const zone = await repo.create({
        id,
        athleteId: user.athleteId,
        name: name.trim(),
        latitude: String(latitude),
        longitude: String(longitude),
        radiusMeters: Number(radiusMeters) || 500,
        isActive: Boolean(isActive),
      });

      return c.json(
        {
          message: 'Privacy zone created',
          privacyZone: {
            ...zone,
            latitude: Number(zone.latitude),
            longitude: Number(zone.longitude),
          },
        },
        201
      );
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // DELETE /api/v1/privacy-zones/:id
  async delete(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Privacy zone ID is required' }, 400);

      const user = c.get('user');
      const repo = this.getRepo(c);

      await repo.delete(id, user.athleteId);
      return c.json({ message: 'Privacy zone deleted' });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }
}
