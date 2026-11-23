/** Google ID-token verification with real RS256 signatures (local key pair standing in for Google's JWKS). */
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { verifyGoogleToken } from '../lib/google-auth';

const AUD = 'web-client-id.apps.googleusercontent.com';
let jwks: ReturnType<typeof createLocalJWKSet>;
let sign: (
  claims: Record<string, unknown>,
  opts?: { iss?: string; aud?: string; exp?: string | number }
) => Promise<string>;
let otherKeySign: (claims: Record<string, unknown>) => Promise<string>;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  jwks = createLocalJWKSet({ keys: [jwk] });
  sign = (claims, o = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(o.iss ?? 'https://accounts.google.com')
      .setAudience(o.aud ?? AUD)
      .setSubject('google-sub-123')
      .setIssuedAt()
      .setExpirationTime(o.exp ?? '1h')
      .sign(privateKey);
  const other = await generateKeyPair('RS256');
  otherKeySign = (claims) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com')
      .setAudience(AUD)
      .setExpirationTime('1h')
      .sign(other.privateKey);
});

describe('verifyGoogleToken', () => {
  it('accepts a correctly signed token for our client and returns the profile', async () => {
    const t = await sign({
      email: 'a@gmail.com',
      email_verified: true,
      name: 'A Person',
      picture: 'https://x/p.png',
    });
    await expect(verifyGoogleToken(t, AUD, jwks)).resolves.toMatchObject({
      googleId: 'google-sub-123',
      email: 'a@gmail.com',
      emailVerified: true,
      displayName: 'A Person',
    });
  });

  it('rejects wrong audience, wrong issuer, expired, forged and missing-client-id cases', async () => {
    const claims = { email: 'a@gmail.com', email_verified: true };
    await expect(
      verifyGoogleToken(await sign(claims, { aud: 'someone-elses-app' }), AUD, jwks)
    ).rejects.toThrow();
    await expect(
      verifyGoogleToken(await sign(claims, { iss: 'https://evil.example' }), AUD, jwks)
    ).rejects.toThrow();
    await expect(
      verifyGoogleToken(await sign(claims, { exp: Math.floor(Date.now() / 1000) - 60 }), AUD, jwks)
    ).rejects.toThrow();
    await expect(verifyGoogleToken(await otherKeySign(claims), AUD, jwks)).rejects.toThrow();
    await expect(verifyGoogleToken(await sign(claims), undefined, jwks)).rejects.toThrow(
      /not configured/
    );
    await expect(verifyGoogleToken('mock:anything', AUD, jwks)).rejects.toThrow();
  });

  it('reports unverified emails so the service refuses to link accounts by email', async () => {
    const t = await sign({ email: 'b@example.com', email_verified: false });
    await expect(verifyGoogleToken(t, AUD, jwks)).resolves.toMatchObject({ emailVerified: false });
  });
});
