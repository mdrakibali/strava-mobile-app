/**
 * OpenStrava API Client
 * Connects directly to Cloudflare Workers Edge API powered by Neon PostgreSQL + Hyperdrive
 */

export const API_BASE_URL = 'https://open-strava-backend.rakib2020-tkg.workers.dev/api/v1';

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorJson.error || `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  // 1. Authentication (Google-Only + Demo)
  auth: {
    googleLogin: (idToken: string) =>
      request<{ token: string; athlete: any }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      }),
    demoLogin: () =>
      request<{ token: string; athlete: any }>('/auth/demo-login', {
        method: 'POST',
      }),
    getMe: () => request<{ athlete: any }>('/auth/me'),
  },

  // 2. Timeline Feed (Cursor-based)
  feed: {
    getFeed: (tab: 'all' | 'following' | 'clubs' = 'all', cursor?: string, limit = 15) => {
      const params = new URLSearchParams({ tab, limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return request<{
        feed: any[];
        count: number;
        tab: string;
        hasNextPage: boolean;
        nextCursor: string | null;
      }>(`/feed?${params.toString()}`);
    },
  },

  // 3. Activities
  activities: {
    create: (data: {
      title: string;
      description?: string;
      sportType: string;
      distanceMeters: number;
      movingTimeSeconds: number;
      elapsedTimeSeconds: number;
      elevationGainMeters?: number;
      rawPolyline: any[];
      splits?: any[];
      elevationProfile?: number[];
      gearId?: string;
    }) =>
      request<{ message: string; activity: any }>('/activities', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<any>(`/activities/${id}`),
    toggleKudos: (id: string) =>
      request<{ hasKudos: boolean; kudosCount: number }>(`/activities/${id}/kudos`, {
        method: 'POST',
      }),
    addComment: (id: string, content: string, parentCommentId?: string) =>
      request<any>(`/activities/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId }),
      }),
    getGpxDownloadUrl: (id: string) => `${API_BASE_URL}/activities/${id}/export`,
  },

  // 4. Clubs
  clubs: {
    list: (query?: string, filter?: 'my') => {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (filter) params.set('filter', filter);
      return request<{ clubs: any[]; count: number }>(`/clubs?${params.toString()}`);
    },
    get: (id: string) => request<any>(`/clubs/${id}`),
    join: (id: string) =>
      request<{ isMember: boolean; message: string }>(`/clubs/${id}/join`, {
        method: 'POST',
      }),
  },

  // 5. Challenges
  challenges: {
    list: () => request<{ challenges: any[]; count: number }>('/challenges'),
    get: (id: string) => request<any>(`/challenges/${id}`),
    join: (id: string) =>
      request<{ isJoined: boolean; message: string }>(`/challenges/${id}/join`, {
        method: 'POST',
      }),
  },

  // 6. Live Beacon Safety Tracking
  beacon: {
    start: (sportType = 'Run') =>
      request<{ session: any; token: string; spectatorPath: string }>('/beacon/start', {
        method: 'POST',
        body: JSON.stringify({ sportType }),
      }),
    ping: (token: string, coords: { latitude: number; longitude: number; altitude?: number; speedMps?: number; batteryPercentage?: number }) =>
      request<{ success: boolean; timestamp: number }>(`/beacon/${token}/ping`, {
        method: 'POST',
        body: JSON.stringify(coords),
      }),
    stop: (token: string) =>
      request<{ message: string }>(`/beacon/${token}/stop`, {
        method: 'POST',
      }),
    getSpectatorView: (token: string) => request<any>(`/beacon/${token}`),
  },

  // 7. Notifications
  notifications: {
    list: () => request<{ notifications: any[]; count: number }>('/notifications'),
    markRead: (id: string) =>
      request<{ message: string }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      }),
    markAllRead: () =>
      request<{ message: string }>('/notifications/read-all', {
        method: 'POST',
      }),
  },
};

