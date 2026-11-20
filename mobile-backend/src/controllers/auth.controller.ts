import { Context } from 'hono';
import { getDb } from '../lib/db';
import { jwtSecret } from '../middleware/auth';
import { AthleteRepository } from '../repositories/athlete.repository';
import { AuthService } from '../services/auth.service';
import { Env } from '../types';

export class AuthController {
  private getService(c: Context<{ Bindings: Env }>) {
    const db = getDb(c);
    const athleteRepo = new AthleteRepository(db);
    return new AuthService(athleteRepo, jwtSecret(c.env), c.env.GOOGLE_CLIENT_ID);
  }

  // POST /api/v1/auth/register
  async register(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json();
      const { email, password, displayName, username } = body;

      if (!email || !password || !displayName) {
        return c.json({ error: 'Email, password, and display name are required' }, 400);
      }

      if (password.length < 6) {
        return c.json({ error: 'Password must be at least 6 characters' }, 400);
      }

      const service = this.getService(c);
      const result = await service.registerWithEmail({ email, password, displayName, username });
      return c.json(result, 201);
    } catch (err: any) {
      console.error('Register controller error:', err);
      return c.json({ error: err.message || 'Registration failed' }, 400);
    }
  }

  // POST /api/v1/auth/login
  async login(c: Context<{ Bindings: Env }>) {
    try {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const service = this.getService(c);
      const result = await service.loginWithEmail(email, password);
      return c.json(result, 200);
    } catch (err: any) {
      console.error('Login controller error:', err);
      return c.json({ error: err.message || 'Login failed' }, 401);
    }
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

