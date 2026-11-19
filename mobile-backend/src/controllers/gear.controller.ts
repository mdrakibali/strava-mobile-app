import { Context } from 'hono';
import { getDb } from '../lib/db';
import { GearRepository } from '../repositories/gear.repository';
import { Env } from '../types';

export class GearController {
  private getRepo(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
    return new GearRepository(db);
  }

  // GET /api/v1/gear
  async list(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const repo = this.getRepo(c);
      const items = await repo.listByAthlete(user.athleteId);

      const formatted = items.map((g) => {
        const dist = Number(g.distanceMeters);
        const maxDist = Number(g.maxDistanceMeters);
        const percent = Math.min(100, Math.round((dist / (maxDist || 1)) * 100));

        return {
          ...g,
          distanceMeters: dist,
          maxDistanceMeters: maxDist,
          distanceKm: (dist / 1000).toFixed(1),
          maxDistanceKm: (maxDist / 1000).toFixed(0),
          usagePercent: percent,
          isNearRetirement: percent >= 90,
        };
      });

      return c.json({ gear: formatted, count: formatted.length });
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/gear
  async create(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json();
      const repo = this.getRepo(c);

      const { name, brand, model, sportType = 'Run', maxDistanceMeters = 500000, isDefault = false } = body;
      if (!name || !brand || !model) {
        return c.json({ error: 'Name, brand, and model are required' }, 400);
      }

      if (isDefault) {
        await repo.clearDefault(user.athleteId, sportType);
      }

      const id = `gear_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const gear = await repo.create({
        id,
        athleteId: user.athleteId,
        name: name.trim(),
        brand: brand.trim(),
        model: model.trim(),
        sportType,
        distanceMeters: '0',
        maxDistanceMeters: String(maxDistanceMeters),
        isDefault: Boolean(isDefault),
        isRetired: false,
      });

      return c.json({ message: 'Gear added', gear }, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // PATCH /api/v1/gear/:id
  async update(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Gear ID is required' }, 400);

      const user = c.get('user');
      const body = await c.req.json();
      const repo = this.getRepo(c);

      const updated = await repo.update(id, user.athleteId, {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.isRetired !== undefined && { isRetired: Boolean(body.isRetired) }),
        ...(body.isDefault !== undefined && { isDefault: Boolean(body.isDefault) }),
      });

      if (!updated) return c.json({ error: 'Gear not found' }, 404);
      return c.json({ message: 'Gear updated', gear: updated });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // DELETE /api/v1/gear/:id
  async delete(c: Context<{ Bindings: Env }>) {
    try {
      const id = c.req.param('id');
      if (!id) return c.json({ error: 'Gear ID is required' }, 400);

      const user = c.get('user');
      const repo = this.getRepo(c);

      await repo.delete(id, user.athleteId);
      return c.json({ message: 'Gear deleted' });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }
}
