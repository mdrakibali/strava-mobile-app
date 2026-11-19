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
  // 1. Authentication (Email/Password & Google OAuth)
  auth: {
    register: (data: { email: string; password: string; displayName: string; username?: string }) =>
      request<{ token: string; athlete: any }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (email: string, password: string) =>
      request<{ token: string; athlete: any }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
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

  // 8. Athletes & Social Graph
  athletes: {
    search: (query = '') =>
      request<{ athletes: any[]; count: number }>(`/athletes/search?q=${encodeURIComponent(query)}`),
    getProfile: (id: string) =>
      request<{ athlete: any; recentActivities: any[] }>(`/athletes/${id}`),
    toggleFollow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number }>(`/athletes/${id}/follow`, {
        method: 'POST',
      }),
  },

  // 10. Privacy Zones (Start/End masking)
  privacyZones: {
    list: () => request<{ privacyZones: any[] }>('/privacy-zones'),
    create: (data: {
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
    }) =>
      request<{ message: string; privacyZone: any }>('/privacy-zones', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/privacy-zones/${id}`, {
        method: 'DELETE',
      }),
  },

  // 11. Direct Messages (1-on-1 Chat)
  messages: {
    getConversations: () =>
      request<{ conversations: any[] }>('/messages/conversations'),
    getThread: (participantId: string) =>
      request<{ messages: any[] }>(`/messages/${participantId}`),
    send: (recipientId: string, text: string) =>
      request<{ message: string; directMessage: any }>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({ recipientId, text }),
      }),
  },

  // 12. Segments & Leaderboards
  segments: {
    list: (sportType?: string) => {
      const q = sportType ? `?sportType=${sportType}` : '';
      return request<{ segments: any[] }>(`/segments${q}`);
    },
    get: (id: string) => request<{ segment: any }>(`/segments/${id}`),
    getLeaderboard: (id: string) =>
      request<{ leaderboard: any[] }>(`/segments/${id}/leaderboard`),
    create: (data: {
      name: string;
      sportType: string;
      distanceMeters: number;
      averageGradePercent?: number;
      elevationGainMeters?: number;
      polylinePoints: any[];
    }) =>
      request<{ message: string; segment: any }>('/segments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // 13. Routes & Builder
  routes: {
    list: (sportType?: string, search?: string) => {
      const params = new URLSearchParams();
      if (sportType) params.set('sportType', sportType);
      if (search) params.set('search', search);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request<{ routes: any[] }>(`/routes${q}`);
    },
    getSaved: () => request<{ savedRoutes: any[] }>('/routes/saved'),
    get: (id: string) => request<{ route: any }>(`/routes/${id}`),
    create: (data: {
      name: string;
      description?: string;
      sportType: string;
      distanceMeters: number;
      elevationGainMeters?: number;
      estimatedTimeSeconds?: number;
      polylinePoints: any[];
      elevationProfile?: number[];
      surfaceTypes?: any;
    }) =>
      request<{ message: string; route: any }>('/routes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggleSave: (id: string) =>
      request<{ message: string; isSaved: boolean }>(`/routes/${id}/toggle-save`, {
        method: 'POST',
      }),
  },

  // 14. Group Events & RSVPs
  events: {
    list: () => request<{ events: any[] }>('/events'),
    get: (id: string) => request<{ event: any; attendees: any[] }>(`/events/${id}`),
    rsvp: (id: string, status: 'GOING' | 'MAYBE' | 'DECLINED') =>
      request<{ message: string; status: string | null }>(`/events/${id}/rsvp`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
  },

  // 15. Training Goals
  goals: {
    list: () => request<{ goals: any[] }>('/goals'),
    create: (data: {
      title: string;
      targetValue: number;
      unit?: string;
      period?: string;
      sportType?: string;
    }) =>
      request<{ goal: any }>('/goals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/goals/${id}`, {
        method: 'DELETE',
      }),
  },
};

