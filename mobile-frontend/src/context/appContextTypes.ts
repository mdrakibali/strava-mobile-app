import {
  Activity,
  Athlete,
  Challenge,
  Club,
  GroupEvent,
  NotificationItem,
  Segment,
  SportType,
} from '../types';

export interface AppContextType {
  currentUser: Athlete;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  activities: Activity[];
  clubs: Club[];
  challenges: Challenge[];
  events: GroupEvent[];
  segments: Segment[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  isSyncing: boolean;

  // Actions
  toggleKudos: (activityId: string) => void;
  addComment: (activityId: string, content: string) => void;
  toggleJoinClub: (clubId: string) => void;
  toggleJoinChallenge: (challengeId: string) => void;
  toggleRsvp: (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  toggleFollowAthlete: (athleteId: string) => void;
  refreshFeed: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (data: { email: string; password: string; displayName: string; username?: string }) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithDemo: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (patch: Partial<Athlete>) => Promise<void>;

}

