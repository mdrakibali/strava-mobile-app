import { generateToken, hashPassword, verifyPassword } from '../lib/auth';
import { verifyGoogleToken } from '../lib/google-auth';
import { AthleteRepository } from '../repositories/athlete.repository';

export class AuthService {
  constructor(
    private athleteRepo: AthleteRepository,
    private jwtSecret: string,
    private googleClientId?: string
  ) {}

  /**
   * Register with Email & Password
   */
  async registerWithEmail(data: { email: string; password: string; displayName: string; username?: string }) {
    const emailNorm = data.email.toLowerCase().trim();
    const existing = await this.athleteRepo.findByEmail(emailNorm);
    if (existing) {
      throw new Error('An athlete with this email already exists');
    }

    const baseUsername = (data.username || emailNorm.split('@')[0]).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    let uniqueUsername = baseUsername || `runner_${Date.now()}`;
    const existingUser = await this.athleteRepo.findByUsername(uniqueUsername);
    if (existingUser) {
      uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const passwordHash = await hashPassword(data.password);
    const athleteId = `ath_${crypto.randomUUID()}`;

    const athlete = await this.athleteRepo.create({
      id: athleteId,
      email: emailNorm,
      passwordHash,
      username: uniqueUsername,
      displayName: data.displayName.trim() || 'Athlete',
      // No invented profile data (city, weight, heart rate…): unknown stays null (MET-01).
    });

    const token = await generateToken(
      {
        athleteId: athlete.id,
        username: athlete.username,
        email: athlete.email,
      },
      this.jwtSecret
    );

    return {
      token,
      athlete: {
        id: athlete.id,
        username: athlete.username,
        displayName: athlete.displayName,
        email: athlete.email,
        avatarUrl: athlete.avatarUrl,
        city: athlete.city,
        country: athlete.country,
        bio: athlete.bio,
        followersCount: 0,
        followingCount: 0,
      },
    };
  }

  /**
   * Login with Email & Password
   */
  async loginWithEmail(email: string, password: string) {
    const emailNorm = email.toLowerCase().trim();
    const athlete = await this.athleteRepo.findByEmail(emailNorm);
    if (!athlete) {
      throw new Error('No athlete found with this email');
    }

    if (!athlete.passwordHash) {
      throw new Error('This account was created with Google. Please sign in with Google.');
    }

    const isValid = await verifyPassword(password, athlete.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const token = await generateToken(
      {
        athleteId: athlete.id,
        username: athlete.username,
        email: athlete.email,
      },
      this.jwtSecret
    );

    const followersCount = await this.athleteRepo.getFollowersCount(athlete.id);
    const followingCount = await this.athleteRepo.getFollowingCount(athlete.id);

    return {
      token,
      athlete: {
        id: athlete.id,
        username: athlete.username,
        displayName: athlete.displayName,
        email: athlete.email,
        avatarUrl: athlete.avatarUrl,
        city: athlete.city,
        country: athlete.country,
        bio: athlete.bio,
        followersCount,
        followingCount,
      },
    };
  }

  /**
   * Google-Only Authentication:
   * Validates Google ID token cryptographically, provisions athlete if new,
   * and issues session JWT.
   */
  async loginWithGoogle(idToken: string) {
    const googleUser = await verifyGoogleToken(idToken, this.googleClientId);

    // 1. Check if athlete exists by Google ID
    let athlete = await this.athleteRepo.findByGoogleId(googleUser.googleId);

    // 2. Fallback: link to an existing email account — only when Google verified that email,
    //    otherwise an unverified Google account could take over someone's account (SEC-06).
    if (!athlete && googleUser.emailVerified) {
      athlete = await this.athleteRepo.findByEmail(googleUser.email);
      if (athlete) {
        // Link Google ID to existing account
        athlete = await this.athleteRepo.update(athlete.id, {
          googleId: googleUser.googleId,
          avatarUrl: athlete.avatarUrl || googleUser.avatarUrl,
        });
      }
    }

    // 3. If athlete doesn't exist, create new athlete profile
    if (!athlete) {
      if (await this.athleteRepo.findByEmail(googleUser.email.toLowerCase().trim())) {
        throw new Error('An account with this email already exists. Sign in with your password.');
      }
      const baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      let uniqueUsername = baseUsername || `runner_${Date.now()}`;

      // Ensure unique username
      const existingUser = await this.athleteRepo.findByUsername(uniqueUsername);
      if (existingUser) {
        uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const athleteId = `ath_${crypto.randomUUID()}`;

      athlete = await this.athleteRepo.create({
        id: athleteId,
        googleId: googleUser.googleId,
        email: googleUser.email.toLowerCase().trim(),
        username: uniqueUsername,
        displayName: googleUser.displayName || 'Athlete',
        avatarUrl: googleUser.avatarUrl,
      });
    }

    // 4. Generate JWT session token
    const token = await generateToken(
      {
        athleteId: athlete.id,
        username: athlete.username,
        email: athlete.email,
      },
      this.jwtSecret
    );

    const followersCount = await this.athleteRepo.getFollowersCount(athlete.id);
    const followingCount = await this.athleteRepo.getFollowingCount(athlete.id);

    return {
      token,
      athlete: {
        id: athlete.id,
        username: athlete.username,
        displayName: athlete.displayName,
        email: athlete.email,
        avatarUrl: athlete.avatarUrl,
        city: athlete.city,
        country: athlete.country,
        bio: athlete.bio,
        followersCount,
        followingCount,
      },
    };
  }

  async getMe(athleteId: string) {
    const athlete = await this.athleteRepo.findById(athleteId);
    if (!athlete) return null;

    const followersCount = await this.athleteRepo.getFollowersCount(athleteId);
    const followingCount = await this.athleteRepo.getFollowingCount(athleteId);

    const { passwordHash: _, ...safeAthlete } = athlete;
    return {
      ...safeAthlete,
      followersCount,
      followingCount,
    };
  }
}

