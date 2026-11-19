import { generateToken } from '../lib/auth';
import { verifyGoogleToken } from '../lib/google-auth';
import { AthleteRepository } from '../repositories/athlete.repository';

export class AuthService {
  constructor(
    private athleteRepo: AthleteRepository,
    private jwtSecret: string,
    private googleClientId?: string
  ) {}

  /**
   * Google-Only Authentication:
   * Validates Google ID token cryptographically, provisions athlete if new,
   * and issues session JWT.
   */
  async loginWithGoogle(idToken: string) {
    const googleUser = await verifyGoogleToken(idToken, this.googleClientId);

    // 1. Check if athlete exists by Google ID
    let athlete = await this.athleteRepo.findByGoogleId(googleUser.googleId);

    // 2. Fallback: check by email if registered previously
    if (!athlete) {
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
      const baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
      let uniqueUsername = baseUsername || `runner_${Date.now()}`;

      // Ensure unique username
      const existingUser = await this.athleteRepo.findByUsername(uniqueUsername);
      if (existingUser) {
        uniqueUsername = `${baseUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      const athleteId = `ath_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      athlete = await this.athleteRepo.create({
        id: athleteId,
        googleId: googleUser.googleId,
        email: googleUser.email.toLowerCase().trim(),
        username: uniqueUsername,
        displayName: googleUser.displayName || 'Athlete',
        avatarUrl: googleUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
        city: 'Dhaka',
        country: 'Bangladesh',
        weightKg: '68.0',
        heightCm: '175.0',
        maxHr: 188,
        restingHr: 54,
        ftpWatts: 220,
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

  /**
   * Demo Login for development testing without live Google client credentials
   */
  async loginWithDemo() {
    return this.loginWithGoogle('demo-google-token');
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
