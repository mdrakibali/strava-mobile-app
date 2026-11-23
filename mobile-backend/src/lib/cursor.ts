/**
 * Utilities for high-performance $O(1)$ cursor-based pagination.
 * Avoids slow SQL OFFSET / LIMIT scans on large social feeds and activity streams.
 */

export interface CursorPayload {
  timestamp: string; // ISO date string
  id: string;
}

export function encodeCursor(date: Date | string, id: string): string {
  const iso = date instanceof Date ? date.toISOString() : new Date(date).toISOString();
  const payload: CursorPayload = { timestamp: iso, id };
  const json = JSON.stringify(payload);
  // Base64url encoding compatible with Node / Cloudflare Workers
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    let base64 = cursor.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const json = atob(base64);
    const parsed = JSON.parse(json);
    if (parsed && parsed.timestamp && parsed.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
