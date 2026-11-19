import { ActiveRecordingState } from '../hooks/use-gps-recorder';
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
  activeRecording: ActiveRecordingState;
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
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithDemo: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;

  // Recording Controls
  startRecording: (sport?: SportType, simulate?: boolean) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  discardRecording: () => void;
  finishRecording: () => ActiveRecordingState;
  toggleSimulation?: () => void;
  saveNewActivity: (
    title: string,
    description: string,
    visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'
  ) => Promise<void>;
}
