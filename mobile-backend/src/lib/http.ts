import { Context } from 'hono';
import { z, ZodTypeAny } from 'zod';

/** Typed API error. Thrown anywhere; turned into JSON by app.onError. */
export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500 | 503,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found`);

/** Parse + validate a JSON body. Malformed JSON → 400; schema violations → 400 with issue list. */
export const parseBody = async <S extends ZodTypeAny>(c: Context, schema: S): Promise<z.output<S>> => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON');
  }
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new HttpError(
      400,
      'validation_failed',
      'Request validation failed',
      r.error.issues.slice(0, 20).map((i) => ({ path: i.path.join('.'), message: i.message }))
    );
  }
  return r.data;
};

export const errorBody = (e: HttpError) => ({
  error: e.message,
  code: e.code,
  ...(e.details !== undefined ? { details: e.details } : {}),
});
