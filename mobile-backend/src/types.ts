export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
  ENVIRONMENT?: string;
}

export interface AuthContext {
  athleteId: string;
  username: string;
  email: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthContext;
  }
}

