export type SportType =
  | 'Run'
  | 'Ride'
  | 'Trail Run'
  | 'Walk'
  | 'Hike'
  | 'Gravel Ride'
  | 'Mountain Bike'
  | 'Virtual Ride'
  | 'Workout';

export type ActivityVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';

export interface Athlete {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  city: string;
  country: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface SplitItem {
  splitNumber: number;
  distanceKm: number;
  paceFormatted: string;
  elevationDeltaMeters: number;
  averageHeartRate?: number;
}

export interface CommentItem {
  id: string;
  activityId: string;
  athlete: Athlete;
  content: string;
  createdAt: string;
  parentCommentId?: string;
  replies?: CommentItem[];
}

export interface LatLngPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: number;
}

export interface Activity {
  id: string;
  athlete: Athlete;
  title: string;
  description?: string;
  sportType: SportType;
  visibility: ActivityVisibility;
  startTime: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  averageCadence?: number;
  averagePowerWatts?: number;
  calories?: number;
  
  // Advanced Parity Analytics
  gradeAdjustedPaceSeconds?: number;
  relativeEffortScore?: number;
  trainingStressScore?: number;
  
  // Display Helpers
  distanceFormatted: string;
  movingTimeFormatted: string;
  paceFormatted: string;
  elevationFormatted: string;
  gapFormatted?: string;
  
  // Route and Visuals
  photos?: string[];
  routePoints?: LatLngPoint[];
  elevationProfile?: number[];
  splits?: SplitItem[];
  
  // Social Interactions
  kudosCount: number;
  hasKudos: boolean;
  commentsCount: number;
  comments?: CommentItem[];
}

export interface Segment {
  id: string;
  name: string;
  sportType: SportType;
  distanceMeters: number;
  averageGradePercent: number;
  elevationGainMeters: number;
  komAthleteName: string;
  komTimeFormatted: string;
  userPrTimeFormatted?: string;
  rank?: number;
  polylinePoints: LatLngPoint[];
}

export interface Club {
  id: string;
  name: string;
  description: string;
  sportType: SportType | 'All Sports';
  city: string;
  memberCount: number;
  isMember: boolean;
  avatarUrl: string;
  bannerUrl: string;
  weeklyDistanceMeters: number;
  weeklyActivitiesCount: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  sportType: SportType;
  targetMeters: number;
  currentMeters: number;
  daysRemaining: number;
  isJoined: boolean;
  isCompleted: boolean;
  badgeUrl: string;
}

export interface GroupEvent {
  id: string;
  title: string;
  clubName: string;
  sportType: SportType;
  dateFormatted: string;
  timeFormatted: string;
  meetingPoint: string;
  distanceMeters: number;
  attendeesCount: number;
  rsvpStatus: 'GOING' | 'MAYBE' | 'DECLINED' | null;
  paceDescription: string;
}

export interface NotificationItem {
  id: string;
  actionType: 'KUDOS' | 'COMMENT' | 'FOLLOW' | 'CHALLENGE_WON' | 'CLUB_INVITE';
  actor: Athlete;
  message: string;
  timeAgo: string;
  isRead: boolean;
  targetActivityId?: string;
}

