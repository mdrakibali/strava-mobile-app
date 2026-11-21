/** Count columns come back as strings or bigints from node-postgres. Never treat 0 as missing. */
export const countOf = (value: unknown): number => {
  const n = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

/**
 * `exists(...)` is a real boolean on most drivers and the string "t"/"f" on others.
 * Boolean("f") is true, which would show a kudos the viewer did not give.
 */
export const flagOf = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 't' || value === 'true';
