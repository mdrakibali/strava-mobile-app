import { SignJWT, jwtVerify } from 'jose';
import { AuthContext } from '../types';

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'open-strava-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const computed = await hashPassword(password);
  return computed === hash;
};

export const generateToken = async (
  payload: AuthContext,
  secret: string
): Promise<string> => {
  const secretKey = new TextEncoder().encode(secret);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
};

export const verifyToken = async (
  token: string,
  secret: string
): Promise<AuthContext | null> => {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      athleteId: (payload.athleteId as string) || (payload.sub as string),
      username: payload.username as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
};

