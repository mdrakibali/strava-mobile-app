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

export type PlaceCategory =
  | 'park'
  | 'garden'
  | 'nature'
  | 'track'
  | 'trail'
  | 'footpath'
  | 'cycleway'
  | 'cycle_route'
  | 'hiking_route'
  | 'recreation';

export interface NearbyPlace {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  distanceM: number;
  lengthM: number | null;
  path: [number, number][][] | null;
  surface: string | null;
  lit: boolean | null;
  address: string | null;
  osmUrl: string;
}

export interface PlaceDetails {
  id: string;
  name: string | null;
  nameEn: string | null;
  tags: {
    website: string | null;
    openingHours: string | null;
    surface: string | null;
    lit: boolean | null;
    access: string | null;
    description: string | null;
  };
  address: string | null;
  image: {
    url: string;
    pageUrl: string;
    author: string | null;
    license: string | null;
    licenseUrl: string | null;
    source: string;
  } | null;
  osmUrl: string;
  attribution: string;
}

export interface PlannedRouteDto {
  geometry: [number, number][];
  distanceM: number;
  durationS: number;
  elevationGainM: number | null;
  elevationLossM: number | null;
  elevationProfile: [number, number][] | null;
}

export interface RoutePlan {
  sport: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  routes: PlannedRouteDto[];
  engine: string;
  attribution: string;
  assumedSpeedKmh: number;
}

export interface NearbyPlacesResponse {
  sport: string;
  radiusM: number;
  center: { lat: number; lng: number };
  source: string;
  provider: 'photon' | 'overpass';
  attribution: string;
  fetchedAt: string;
  cached: boolean;
  places: NearbyPlace[];
}

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
  weeks: {
    weekStart: string;
    bySport: Record<string, { distance: number; moving: number; elevation: number; count: number }>;
  }[];
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

/**
 * Called when the server rejects the CURRENT session token (expired or revoked). Wrong-password
 * logins don't trigger it: no token is attached to those requests.
 */
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

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
  const method = (options.method || 'GET').toUpperCase();
  const finalUrl =
    method === 'GET'
      ? url.includes('?')
        ? `${url}&_t=${Date.now()}`
        : `${url}?_t=${Date.now()}`
      : url;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    ...(options.headers as Record<string, string>),
  };

  const sentToken = authToken;
  if (sentToken) {
    headers['Authorization'] = `Bearer ${sentToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    // no-store: the feed and social counts must always come from the server (stale-feed fix).
    res = await fetch(finalUrl, {
      cache: 'no-store',
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new ApiError(
      e?.name === 'AbortError'
        ? 'The server took too long to respond.'
        : 'No connection to the server.',
      0,
      'network'
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    // The route itself doesn't exist on this server (older deployment): say so plainly instead of
    // a confusing "not found" — never pretend the action worked.
    if (res.status === 404 && body?.error === 'Endpoint Not Found') {
      throw new ApiError(
        'This feature needs the latest server version, which is not deployed yet.',
        404,
        'endpoint_missing'
      );
    }
    // Only react if the token that failed is still the active one (a late 401 from a previous
    // account must not sign the new one out).
    if (res.status === 401 && sentToken && sentToken === authToken) unauthorizedHandler?.();
    throw new ApiError(
      body?.error || `HTTP ${res.status}`,
      res.status,
      body?.code ?? null,
      body?.details ?? null
    );
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
    getMe: () => request<{ athlete: any }>('/auth/me'),
  },

  // 2. Timeline Feed
  feed: {
    getFeed: (tab: 'all' | 'following' | 'clubs' = 'all') => {
      return request<{
        feed: any[];
        count: number;
        tab: string;
      }>(`/feed?tab=${tab}`);
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
      request<{ hasKudos: boolean; kudosCount: number }>(`/activities/${id}/kudos`, {
        method: 'PUT',
      }),
    removeKudos: (id: string) =>
      request<{ hasKudos: boolean; kudosCount: number }>(`/activities/${id}/kudos`, {
        method: 'DELETE',
      }),
    listKudos: (id: string) =>
      request<{ athletes: any[]; kudosCount: number }>(`/activities/${id}/kudos`),
    listComments: (id: string) => request<{ comments: any[] }>(`/activities/${id}/comments`),
    editComment: (id: string, commentId: string, content: string) =>
      request<{ comment: any }>(`/activities/${id}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content }),
      }),
    deleteComment: (id: string, commentId: string) =>
      request<{ commentsCount: number }>(`/activities/${id}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    addComment: (id: string, content: string, parentCommentId?: string) =>
      request<any>(`/activities/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId }),
      }),
    getGpxDownloadUrl: (id: string) => `${API_BASE_URL}/activities/${id}/export`,
    /** Owner only. Returns the same shape as get(). */
    update: (
      id: string,
      data: { title?: string; description?: string | null; sportType?: string; visibility?: string }
    ) => request<any>(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    /** Owner only. */
    remove: (id: string) => request<void>(`/activities/${id}`, { method: 'DELETE' }),
  },

  /** Batch GPS upload protocol (shared/tracking/batching.ts). All calls are idempotent. */
  uploads: {
    start: (data: UploadStartRequest) =>
      request<UploadStatusResponse>('/activities/uploads', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
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
    create: (data: {
      name: string;
      sportType: string;
      city?: string;
      country?: string;
      description?: string;
      isPrivate?: boolean;
    }) => request<{ club: any }>('/clubs', { method: 'POST', body: JSON.stringify(data) }),
    /** Pass the wanted state: the call is then idempotent (a retry can't flip it back). */
    join: (id: string, join?: boolean) =>
      request<{ isMember: boolean; membersCount?: number; message: string }>(`/clubs/${id}/join`, {
        method: 'POST',
        body: JSON.stringify(join === undefined ? {} : { join }),
      }),
    update: (
      id: string,
      data: {
        name?: string;
        sportType?: string;
        city?: string | null;
        description?: string | null;
        isPrivate?: boolean;
      }
    ) => request<{ club: any }>(`/clubs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ message: string }>(`/clubs/${id}`, { method: 'DELETE' }),
  },

  // 5. Challenges
  challenges: {
    list: () => request<{ challenges: any[]; count: number }>('/challenges'),
    get: (id: string) => request<any>(`/challenges/${id}`),
    create: (data: {
      title: string;
      sportType: string;
      targetMeters: number;
      description?: string;
      startDate: string;
      endDate: string;
    }) =>
      request<{ challenge: any }>('/challenges', { method: 'POST', body: JSON.stringify(data) }),
    join: (id: string, join?: boolean) =>
      request<{ isJoined: boolean; participantsCount?: number; message: string }>(
        `/challenges/${id}/join`,
        {
          method: 'POST',
          body: JSON.stringify(join === undefined ? {} : { join }),
        }
      ),
    update: (
      id: string,
      data: {
        title?: string;
        sportType?: string;
        targetMeters?: number;
        description?: string | null;
        startDate?: string;
        endDate?: string;
      }
    ) =>
      request<{ challenge: any }>(`/challenges/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (id: string) => request<{ message: string }>(`/challenges/${id}`, { method: 'DELETE' }),
  },

  // 6. Live Beacon Safety Tracking
  beacon: {
    start: (sportType = 'Run') =>
      request<{ session: any; token: string; spectatorPath: string }>('/beacon/start', {
        method: 'POST',
        body: JSON.stringify({ sportType }),
      }),
    ping: (
      token: string,
      coords: {
        latitude: number;
        longitude: number;
        altitude?: number;
        speedMps?: number;
        batteryPercentage?: number;
      }
    ) =>
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
      request<{ athletes: any[]; count: number }>(
        `/athletes/search?q=${encodeURIComponent(query)}`
      ),
    getProfile: (id: string) =>
      request<{ athlete: any; recentActivities: any[] }>(`/athletes/${id}`),
    /** Activity history, policy-filtered by the server. */
    listActivities: (id: string) =>
      request<{ activities: any[]; count?: number }>(`/athletes/${id}/activities`),
    toggleFollow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number }>(`/athletes/${id}/follow`, {
        method: 'POST',
      }),
    follow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number; followingCount: number }>(
        `/athletes/${id}/follow`,
        { method: 'PUT' }
      ),
    unfollow: (id: string) =>
      request<{ isFollowing: boolean; followersCount: number; followingCount: number }>(
        `/athletes/${id}/follow`,
        { method: 'DELETE' }
      ),
    listFollows: (id: string, kind: 'followers' | 'following') =>
      request<{ athletes: any[]; count?: number }>(`/athletes/${id}/${kind}`),
    stats: (id: string) => request<AthleteStats>(`/athletes/${id}/stats`),
    /** PUT /athletes/me (existing backend route; previously unused — profile edit was a fake save). */
    updateMe: (data: { displayName?: string; bio?: string; city?: string; country?: string }) =>
      request<{ message: string; athlete: any }>('/athletes/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  /** Real OSM places near a real position (backend proxies Photon/Overpass with caching). */
  places: {
    /** OSM details + a genuine Wikimedia Commons photo (or null) with attribution. */
    details: (osmId: string) => request<PlaceDetails>(`/places/${osmId}`),
    nearby: (lat: number, lng: number, sport: string, radiusM = 5000) =>
      request<NearbyPlacesResponse>(
        `/places/nearby?${new URLSearchParams({ lat: String(lat), lng: String(lng), sport, radius: String(radiusM) }).toString()}`
      ),
  },

  /** Real routes over mapped ways (Valhalla) with DEM elevation. */
  routing: {
    plan: (sport: string, from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
      request<RoutePlan>('/routing/plan', {
        method: 'POST',
        body: JSON.stringify({ sport, from, to }),
      }),
  },

  // 10. Privacy Zones (Start/End masking)
  privacyZones: {
    list: () => request<{ privacyZones: any[] }>('/privacy-zones'),
    create: (data: { name: string; latitude: number; longitude: number; radiusMeters?: number }) =>
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
    getConversations: () => request<{ conversations: any[] }>('/messages/conversations'),
    /** Opens the existing direct conversation or creates one. Safe to call repeatedly. */
    open: (targetUserId: string) =>
      request<{ conversation: { id: string; participant: any }; created: boolean }>(
        '/messages/conversations',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId }),
        }
      ),
    getThread: (idOrParticipantId: string) =>
      request<{ messages: any[]; chatId?: string; partner?: any }>(
        `/messages/${idOrParticipantId}`
      ),
    send: (
      recipientOrChatId: string,
      text: string,
      options?: { chatId?: string; recipientId?: string }
    ) =>
      request<{ message: string; directMessage: any; chatId?: string }>('/messages/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientId:
            options?.recipientId ||
            (recipientOrChatId.startsWith('chat_') ? undefined : recipientOrChatId),
          chatId:
            options?.chatId ||
            (recipientOrChatId.startsWith('chat_') ? recipientOrChatId : undefined),
          text,
        }),
      }),
  },

  // 12. Segments & Leaderboards
  segments: {
    list: (sportType?: string) => {
      const q = sportType ? `?sportType=${sportType}` : '';
      return request<{ segments: any[] }>(`/segments${q}`);
    },
    get: (id: string) => request<{ segment: any }>(`/segments/${id}`),
    getLeaderboard: (id: string) => request<{ leaderboard: any[] }>(`/segments/${id}/leaderboard`),
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
    create: (data: {
      title: string;
      sportType: string;
      eventDate: string;
      meetingPoint: string;
      paceDescription?: string;
      distanceMeters?: number;
      clubId?: string;
    }) => request<{ event: any }>('/events', { method: 'POST', body: JSON.stringify(data) }),
    update: (
      id: string,
      data: {
        title?: string;
        sportType?: string;
        eventDate?: string;
        meetingPoint?: string;
        paceDescription?: string | null;
        distanceMeters?: number | null;
      }
    ) => request<{ event: any }>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: string) => request<{ message: string }>(`/events/${id}`, { method: 'DELETE' }),
    rsvp: (id: string, status: 'GOING' | 'MAYBE' | 'DECLINED') =>
      request<{ message: string; status: string | null; attendeesCount?: number }>(
        `/events/${id}/rsvp`,
        {
          method: 'POST',
          body: JSON.stringify({ status }),
        }
      ),
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
