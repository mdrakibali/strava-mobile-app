import { Context } from 'hono';
import { getDb } from '../lib/db';
import { AthleteRepository } from '../repositories/athlete.repository';
import { AuthService } from '../services/auth.service';
import { Env } from '../types';

export class AuthController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c.env);
    const athleteRepo = new AthleteRepository(db);
    return new AuthService(athleteRepo, c.env.JWT_SECRET, c.env.GOOGLE_CLIENT_ID);
  }

  // POST /api/v1/auth/google
  async googleLogin(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json();
      const { idToken } = body;

      if (!idToken) {
        return c.json({ error: 'Missing required field: idToken' }, 400);
      }

      const service = this.getService(c);
      const result = await service.loginWithGoogle(idToken);
      return c.json(result, 200);
    } catch (err: any) {
      console.error('Google login controller error:', err);
      return c.json({ error: err.message || 'Authentication failed' }, 401);
    }
  }

  // POST /api/v1/auth/demo-login
  async demoLogin(c: Context<{ Bindings: Env }>) {
    try {
      const service = this.getService(c);
      const result = await service.loginWithDemo();
      return c.json(result, 200);
    } catch (err: any) {
      return c.json({ error: err.message || 'Demo login failed' }, 500);
    }
  }

  // GET /api/v1/auth/me
  async getMe(c: Context<{ Bindings: Env }>) {
    const user = c.get('user');
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const service = this.getService(c);
    const athlete = await service.getMe(user.athleteId);
    if (!athlete) return c.json({ error: 'Athlete not found' }, 404);

    return c.json({ athlete });
  }
}

