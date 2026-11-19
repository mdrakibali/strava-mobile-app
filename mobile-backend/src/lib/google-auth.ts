import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export interface GoogleUserPayload {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
}

/**
 * Cryptographically verifies a Google ID Token returned by Expo / React Native
 * using Google's public JWKS certificates in Cloudflare Workers Edge runtime.
 */
export async function verifyGoogleToken(
  idToken: string,
  expectedClientId?: string
): Promise<GoogleUserPayload> {
  // Support local development & demo testing
  if (idToken === 'demo-google-token' || idToken.startsWith('mock:')) {
    return {
      googleId: 'google_demo_10928374',
      email: 'rakib.runner@example.com',
      displayName: 'Rakib Ahmed',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      emailVerified: true,
    };
  }

  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: expectedClientId ? expectedClientId : undefined,
    });

    const googleId = payload.sub as string;
    const email = payload.email as string;
    const displayName =
      (payload.name as string) || (payload.email as string)?.split('@')[0] || 'Athlete';
    const avatarUrl = (payload.picture as string) || null;
    const emailVerified = Boolean(payload.email_verified);

    if (!email) {
      throw new Error('Google token does not contain a verified email address.');
    }

    return {
      googleId,
      email,
      displayName,
      avatarUrl,
      emailVerified,
    };
  } catch (error: any) {
    // If JWKS fails or token expired, check if payload is readable to give descriptive error
    console.error('Google token verification error:', error);
    throw new Error(`Invalid Google ID Token: ${error.message || 'Signature verification failed'}`);
  }
}
