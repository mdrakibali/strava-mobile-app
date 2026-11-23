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
  expectedClientId?: string,
  /** Key source (Google's JWKS in production; a local key set in tests). */
  jwks: Parameters<typeof jwtVerify>[1] = GOOGLE_JWKS
): Promise<GoogleUserPayload> {
  // No test/mock tokens here: the old 'demo-google-token' / 'mock:' bypass let anyone log in
  // without Google (SEC-02). The audience is mandatory so tokens minted for other apps are rejected.
  if (!expectedClientId) throw new Error('Google sign-in is not configured on the server');

  try {
    const { payload } = await jwtVerify(idToken, jwks as any, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: expectedClientId,
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
