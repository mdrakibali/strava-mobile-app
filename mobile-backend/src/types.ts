export interface Hyperdrive {
  connectionString: string;
}

export interface Env {
  DATABASE_URL: string;
  JWT_SECRET: string;
  CORS_ORIGIN?: string;
  ENVIRONMENT?: string;
  GOOGLE_CLIENT_ID?: string;
  HYPERDRIVE?: Hyperdrive;
  CHAT_ROOM?: any;
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
