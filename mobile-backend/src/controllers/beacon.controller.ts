import { Context } from 'hono';
import { getDb } from '../lib/db';
import { BeaconRepository } from '../repositories/beacon.repository';
import { BeaconService } from '../services/beacon.service';
import { Env } from '../types';

export class BeaconController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
    return new BeaconService(new BeaconRepository(db));
  }

  // POST /api/v1/beacon/start
  async start(c: Context<{ Bindings: Env }>) {
    try {
      const user = c.get('user');
      const body = await c.req.json().catch(() => ({}));
      const service = this.getService(c);

      const result = await service.startBeaconSession(user.athleteId, body.sportType || 'Run');
      return c.json(result, 201);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/beacon/:token/ping
  async ping(c: Context<{ Bindings: Env }>) {
    try {
      const token = c.req.param('token');
      if (!token) return c.json({ error: 'Token is required' }, 400);

      const body = await c.req.json();
      const service = this.getService(c);

      const { latitude, longitude, altitude, speedMps, batteryPercentage } = body;
      if (latitude === undefined || longitude === undefined) {
        return c.json({ error: 'Latitude and longitude are required' }, 400);
      }

      await service.pingLocation(token, {
        latitude: Number(latitude),
        longitude: Number(longitude),
        altitude: altitude !== undefined ? Number(altitude) : null,
        speedMps: speedMps !== undefined ? Number(speedMps) : null,
        batteryPercentage: batteryPercentage !== undefined ? Number(batteryPercentage) : undefined,
      });

      return c.json({ success: true, timestamp: Date.now() });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  // GET /api/v1/beacon/:token (Public Spectator View)
  async getSpectator(c: Context<{ Bindings: Env }>) {
    try {
      const token = c.req.param('token');
      if (!token) return c.json({ error: 'Token is required' }, 400);

      const service = this.getService(c);
      const view = await service.getSpectatorView(token);
      if (!view) return c.json({ error: 'Live Beacon session not found or expired' }, 404);

      return c.json(view);
    } catch (err: any) {
      return c.json({ error: err.message }, 500);
    }
  }

  // POST /api/v1/beacon/:token/stop
  async stop(c: Context<{ Bindings: Env }>) {
    try {
      const token = c.req.param('token');
      if (!token) return c.json({ error: 'Token is required' }, 400);

      const user = c.get('user');
      const service = this.getService(c);

      await service.stopBeaconSession(token, user.athleteId);
      return c.json({ message: 'Beacon session ended' });
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }
}
