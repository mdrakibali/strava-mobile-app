import { Hono } from 'hono';
import { eq, or } from 'drizzle-orm';
import { athletes } from '../db/schema';
import { generateToken, hashPassword, verifyPassword } from '../lib/auth';
import { getDb } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const authRouter = new Hono<{ Bindings: Env }>();

// POST /api/v1/auth/register
authRouter.post('/register', async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const { username, email, password, displayName, city, country, weightKg, heightCm, maxHr } = body;

  if (!username || !email || !password || !displayName) {
    return c.json({ error: 'Missing required fields: username, email, password, displayName' }, 400);
  }

  // Check if athlete already exists
  const existing = await db
    .select()
    .from(athletes)
    .where(or(eq(athletes.email, email.toLowerCase().trim()), eq(athletes.username, username.toLowerCase().trim())))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: 'An athlete with this username or email already exists' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const athleteId = `ath_${Date.now()}`;

  const [newAthlete] = await db
    .insert(athletes)
    .values({
      id: athleteId,
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      displayName: displayName.trim(),
      city: city || 'Dhaka',
      country: country || 'Bangladesh',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400`,
      weightKg: weightKg ? String(weightKg) : '68.0',
      heightCm: heightCm ? String(heightCm) : '175.0',
      maxHr: maxHr || 188,
      restingHr: 52,
    })
    .returning();

  const token = await generateToken(
    {
      athleteId: newAthlete.id,
      username: newAthlete.username,
      email: newAthlete.email,
    },
    c.env.JWT_SECRET
  );

  return c.json(
    {
      message: 'Athlete account created successfully',
      token,
      athlete: {
        id: newAthlete.id,
        username: newAthlete.username,
        displayName: newAthlete.displayName,
        email: newAthlete.email,
        avatarUrl: newAthlete.avatarUrl,
        city: newAthlete.city,
        country: newAthlete.country,
      },
    },
    201
  );
});

// POST /api/v1/auth/login
authRouter.post('/login', async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const body = await c.req.json();
  const { emailOrUsername, password } = body;

  if (!emailOrUsername || !password) {
    return c.json({ error: 'Please provide email/username and password' }, 400);
  }

  const query = emailOrUsername.toLowerCase().trim();
  const [athlete] = await db
    .select()
    .from(athletes)
    .where(or(eq(athletes.email, query), eq(athletes.username, query)))
    .limit(1);

  if (!athlete) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const isValid = await verifyPassword(password, athlete.passwordHash);
  if (!isValid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await generateToken(
    {
      athleteId: athlete.id,
      username: athlete.username,
      email: athlete.email,
    },
    c.env.JWT_SECRET
  );

  return c.json({
    message: 'Login successful',
    token,
    athlete: {
      id: athlete.id,
      username: athlete.username,
      displayName: athlete.displayName,
      email: athlete.email,
      avatarUrl: athlete.avatarUrl,
      city: athlete.city,
      country: athlete.country,
    },
  });
});

// POST /api/v1/auth/demo-login (Instant access for mobile testing)
authRouter.post('/demo-login', async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, 'user_current'))
    .limit(1);

  if (!athlete) {
    return c.json({ error: 'Demo athlete not found in database. Run seed.' }, 404);
  }

  const token = await generateToken(
    {
      athleteId: athlete.id,
      username: athlete.username,
      email: athlete.email,
    },
    c.env.JWT_SECRET
  );

  return c.json({
    message: 'Demo login successful',
    token,
    athlete: {
      id: athlete.id,
      username: athlete.username,
      displayName: athlete.displayName,
      email: athlete.email,
      avatarUrl: athlete.avatarUrl,
      city: athlete.city,
      country: athlete.country,
    },
  });
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const user = c.get('user');

  const [athlete] = await db
    .select()
    .from(athletes)
    .where(eq(athletes.id, user.athleteId))
    .limit(1);

  if (!athlete) {
    return c.json({ error: 'Athlete not found' }, 404);
  }

  const { passwordHash: _, ...safeAthlete } = athlete;
  return c.json({ athlete: safeAthlete });
});
