/**
 * OpenStrava API client (Cloudflare Workers + Neon via Hyperdrive).
 * Base URL is configurable per build/run: EXPO_PUBLIC_API_URL (e.g. a local dev server via
 * `adb reverse tcp:8787 tcp:8787` → http://localhost:8787/api/v1).
 */
import type {
  UploadBatchRequest,
  UploadCompleteRequest,
  UploadStartRequest,
  UploadStatusResponse,
} from '../tracking/shared';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://open-strava-backend.rakib2020-tkg.workers.dev/api/v1';

const TIMEOUT_MS = 30_000;

export interface Totals {
  count: number;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationGainMeters: number;
}

export interface AthleteStats {
  activityCount: number;
  followersCount: number;
  followingCount: number;
  bySport: { sportType: string; allTime: Totals; yearToDate: Totals }[];
  weeks: { weekStart: string; bySport: Record<string, { distance: number; moving: number; elevation: number; count: number }> }[];
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

/**
 * Typed API failure. status 0 = network failure or timeout (no HTTP response).
 * `retryable` tells the sync worker whether trying again later can succeed.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
    readonly details: any = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
  get retryable() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

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

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    // no-store: the feed and social counts must always come from the server (stale-feed fix).
    res = await fetch(url, { cache: 'no-store', ...options, headers, signal: controller.signal });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError' ? 'The server took too long to respond.' : 'No connection to the server.',
      0,
      'network'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body?.error || `HTTP ${res.status}`, res.status, body?.code ?? null, body?.details ?? null);
  }

  if (res.status === 204) return undefined as T;
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
      clientActivityId?: string;
      title: string;
      description?: string;
      sportType: string;
      distanceMeters: number;
      movingTimeSeconds: number;
      elapsedTimeSeconds: number;
      elevationGainMeters?: number;
      visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';
      startTime?: string;
      maxSpeedMps?: number;
      calories?: number;
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
    giveKudos: (id: string) =>
      request<{ hasKudos: boolean; kudosCount: number }>(`/activities/${id}/kudos`, { method: 'PUT' }),
    removeKudos: (id: string) =>
      request<{ hasKudos: boolean; kudosCount: number }>(`/activities/${id}/kudos`, { method: 'DELETE' }),
    listKudos: (id: string, cursor?: string | null) =>
      request<{ athletes: any[]; kudosCount: number; hasNextPage: boolean; nextCursor: string | null }>(
        `/activities/${id}/kudos${cursor ? `?cursor=${cursor}` : ''}`
      ),
    listComments: (id: string, cursor?: string | null) =>
      request<{ comments: any[]; hasNextPage: boolean; nextCursor: string | null }>(
        `/activities/${id}/comments${cursor ? `?cursor=${cursor}` : ''}`
      ),
    editComment: (id: string, commentId: string, content: string) =>
      request<{ comment: any }>(`/activities/${id}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),
    deleteComment: (id: string, commentId: string) =>
      request<{ commentsCount: number }>(`/activities/${id}/comments/${commentId}`, { method: 'DELETE' }),
    addComment: (id: string, content: string, parentCommentId?: string) =>
      request<any>(`/activities/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId }),
      }),
    getGpxDownloadUrl: (id: string) => `${API_BASE_URL}/activities/${id}/export`,
    /** Owner only. Returns the same shape as get(). */
    update: (id: string, data: { title?: string; description?: string | null; sportType?: string; visibility?: string }) =>
      request<any>(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    /** Owner only. */
    remove: (id: string) => request<void>(`/activities/${id}`, { method: 'DELETE' }),
  },

  /** Batch GPS upload protocol (shared/tracking/batching.ts). All calls are idempotent. */
  uploads: {
    start: (data: UploadStartRequest) =>
      request<UploadStatusResponse>('/activities/uploads', { method: 'POST', body: JSON.stringify(data) }),
    putBatch: (clientActivityId: string, seq: number, data: UploadBatchRequest) =>
      request<{ seq: number; duplicate: boolean; completed: boolean }>(
        `/activities/uploads/${clientActivityId}/batches/${seq}`,
        { method: 'PUT', body: JSON.stringify(data) }
      ),
    complete: (clientActivityId: string, data: UploadCompleteRequest) =>
      request<{ created: boolean; deleted: boolean; activity: any | null }>(
        `/activities/uploads/${clientActivityId}/complete`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
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
    create: (data: { name: string; sportType: string; city?: string; country?: string; description?: string; isPrivate?: boolean }) =>
      request<{ club: any }>('/clubs', { method: 'POST', body: JSON.stringify(data) }),
    join: (id: string) =>
      request<{ isMember: boolean; message: string }>(`/clubs/${id}/join`, {
        method: 'POST',
      }),
  },

  // 5. Challenges
  challenges: {
    list: () => request<{ challenges: any[]; count: number }>('/challenges'),
    get: (id: string) => request<any>(`/challenges/${id}`),
    create: (data: { title: string; sportType: string; targetMeters: number; description?: string; startDate: string; endDate: string }) =>
      request<{ challenge: any }>('/challenges', { method: 'POST', body: JSON.stringify(data) }),
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
    /** Activity history, policy-filtered by the server, cursor-paginated. */
    listActivities: (id: string, cursor?: string | null, limit = 20) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) params.set('cursor', cursor);
      return request<{ activities: any[]; hasNextPage: boolean; nextCursor: string | null }>(
        `/athletes/${id}/activities?${params.toString()}`
      );
    },
    toggleFollow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number }>(`/athletes/${id}/follow`, {
        method: 'POST',
      }),
    follow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number; followingCount: number }>(`/athletes/${id}/follow`, { method: 'PUT' }),
    unfollow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number; followingCount: number }>(`/athletes/${id}/follow`, { method: 'DELETE' }),
    listFollows: (id: string, kind: 'followers' | 'following', cursor?: string | null) =>
      request<{ athletes: any[]; hasNextPage: boolean; nextCursor: string | null }>(
        `/athletes/${id}/${kind}${cursor ? `?cursor=${cursor}` : ''}`
      ),
    stats: (id: string) => request<AthleteStats>(`/athletes/${id}/stats`),
    /** PUT /athletes/me (existing backend route; previously unused — profile edit was a fake save). */
    updateMe: (data: { displayName?: string; bio?: string; city?: string; country?: string }) =>
      request<{ message: string; athlete: any }>('/athletes/me', {
        method: 'PUT',
        body: JSON.stringify(data),
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
    create: (data: { title: string; sportType: string; eventDate: string; meetingPoint: string; paceDescription?: string; distanceMeters?: number; clubId?: string }) =>
      request<{ event: any }>('/events', { method: 'POST', body: JSON.stringify(data) }),
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

