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
  activities: Activity[];
  clubs: Club[];
  challenges: Challenge[];
  events: GroupEvent[];
  segments: Segment[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  activeRecording: ActiveRecordingState;

  // Actions
  toggleKudos: (activityId: string) => void;
  addComment: (activityId: string, content: string) => void;
  toggleJoinClub: (clubId: string) => void;
  toggleJoinChallenge: (challengeId: string) => void;
  toggleRsvp: (eventId: string, status: 'GOING' | 'MAYBE' | 'DECLINED') => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  toggleFollowAthlete: (athleteId: string) => void;

  // Recording Controls
  startRecording: (sport?: SportType) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  discardRecording: () => void;
  finishRecording: () => ActiveRecordingState;
  saveNewActivity: (
    title: string,
    description: string,
    visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME'
  ) => void;
}
